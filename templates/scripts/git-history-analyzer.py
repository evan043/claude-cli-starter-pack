#!/usr/bin/env python3
"""
Git History Analyzer

Security audit for sensitive data in git history.
Scans commits for passwords, API keys, tokens, and other secrets.

Usage:
    python git-history-analyzer.py
    python git-history-analyzer.py --patterns "password|secret|api.key"
    python git-history-analyzer.py --since "2024-01-01" --output json
"""

import subprocess
import re
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path

# Default patterns for sensitive data
DEFAULT_PATTERNS = [
    # API keys and tokens
    r'(?i)(api[_-]?key|apikey)\s*[:=]\s*["\']?[\w-]{20,}',
    r'(?i)(access[_-]?token|auth[_-]?token)\s*[:=]\s*["\']?[\w-]{20,}',
    r'(?i)(secret[_-]?key|private[_-]?key)\s*[:=]\s*["\']?[\w-]{20,}',

    # Passwords
    r'(?i)password\s*[:=]\s*["\'][^"\']{4,}["\']',
    r'(?i)passwd\s*[:=]\s*["\'][^"\']{4,}["\']',

    # AWS
    r'AKIA[0-9A-Z]{16}',  # AWS Access Key
    r'(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]',

    # GitHub
    r'ghp_[a-zA-Z0-9]{36}',  # GitHub Personal Access Token
    r'github[_-]?token\s*[:=]',

    # Generic secrets
    r'(?i)bearer\s+[a-zA-Z0-9\-._~+/]+=*',
    r'(?i)-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',

    # Database URLs
    r'(?i)(postgres|mysql|mongodb|redis)://[^\s"\']+',

    # Environment variables with sensitive names
    r'(?i)(DB_PASSWORD|DATABASE_PASSWORD|MYSQL_ROOT_PASSWORD)\s*=',
    r'(?i)(JWT_SECRET|SESSION_SECRET|ENCRYPTION_KEY)\s*=',
]


class GitHistoryAnalyzer:
    def __init__(self, patterns=None, since=None, verbose=False):
        self.patterns = patterns or DEFAULT_PATTERNS
        self.compiled_patterns = [re.compile(p) for p in self.patterns]
        self.since = since
        self.verbose = verbose
        self.findings = []

    def run(self):
        """Run the analysis."""
        print("\n🔍 Git History Security Audit\n")

        if not self._is_git_repo():
            print("❌ Not a git repository")
            return False

        print(f"Scanning {len(self.patterns)} patterns...")
        if self.since:
            print(f"Since: {self.since}")
        print()

        commits = self._get_commits()
        print(f"Found {len(commits)} commits to analyze\n")

        for i, commit in enumerate(commits, 1):
            if self.verbose:
                print(f"[{i}/{len(commits)}] {commit['hash'][:8]}", end='\r')
            self._analyze_commit(commit)

        if self.verbose:
            print()

        return self.findings

    def _is_git_repo(self):
        """Check if current directory is a git repository."""
        try:
            subprocess.run(
                ['git', 'rev-parse', '--git-dir'],
                capture_output=True,
                check=True
            )
            return True
        except subprocess.CalledProcessError:
            return False

    def _get_commits(self):
        """Get list of commits to analyze."""
        cmd = ['git', 'log', '--pretty=format:%H|%an|%ae|%ad|%s', '--date=iso']

        if self.since:
            cmd.extend(['--since', self.since])

        result = subprocess.run(cmd, capture_output=True, text=True)
        commits = []

        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('|', 4)
                if len(parts) == 5:
                    commits.append({
                        'hash': parts[0],
                        'author': parts[1],
                        'email': parts[2],
                        'date': parts[3],
                        'message': parts[4],
                    })

        return commits

    def _analyze_commit(self, commit):
        """Analyze a single commit for sensitive data."""
        # Get diff for this commit
        cmd = ['git', 'show', '--pretty=', '--diff-filter=AM', commit['hash']]
        result = subprocess.run(cmd, capture_output=True, text=True)

        diff = result.stdout

        # Check each pattern
        for i, pattern in enumerate(self.compiled_patterns):
            matches = pattern.findall(diff)
            if matches:
                for match in matches:
                    finding = {
                        'commit': commit['hash'],
                        'author': commit['author'],
                        'date': commit['date'],
                        'message': commit['message'],
                        'pattern': self.patterns[i],
                        'match': match if isinstance(match, str) else match[0],
                        'severity': self._get_severity(self.patterns[i]),
                    }
                    self.findings.append(finding)

    def _get_severity(self, pattern):
        """Determine severity based on pattern type."""
        high_severity = ['password', 'private.key', 'aws', 'secret']
        medium_severity = ['api.key', 'token', 'bearer']

        pattern_lower = pattern.lower()

        if any(s in pattern_lower for s in high_severity):
            return 'HIGH'
        elif any(s in pattern_lower for s in medium_severity):
            return 'MEDIUM'
        else:
            return 'LOW'

    def print_report(self):
        """Print human-readable report."""
        if not self.findings:
            print("✅ No sensitive data found in git history\n")
            return

        print(f"\n⚠️  Found {len(self.findings)} potential issues\n")
        print("=" * 70)

        # Group by severity
        by_severity = {'HIGH': [], 'MEDIUM': [], 'LOW': []}
        for finding in self.findings:
            by_severity[finding['severity']].append(finding)

        for severity in ['HIGH', 'MEDIUM', 'LOW']:
            findings = by_severity[severity]
            if findings:
                icon = '🔴' if severity == 'HIGH' else '🟡' if severity == 'MEDIUM' else '🔵'
                print(f"\n{icon} {severity} Severity ({len(findings)} issues)\n")

                for f in findings[:10]:  # Limit to 10 per severity
                    print(f"  Commit: {f['commit'][:8]}")
                    print(f"  Date:   {f['date']}")
                    print(f"  Author: {f['author']}")
                    print(f"  Match:  {f['match'][:50]}...")
                    print()

                if len(findings) > 10:
                    print(f"  ... and {len(findings) - 10} more\n")

        print("=" * 70)
        print("\n📋 Recommendations:\n")

        if by_severity['HIGH']:
            print("  1. Immediately rotate any exposed credentials")
            print("  2. Consider using git-filter-repo to remove sensitive commits")
            print("  3. Add patterns to .gitignore and pre-commit hooks")

        print("  4. Use environment variables for secrets")
        print("  5. Consider using a secrets manager (Vault, AWS Secrets Manager)")
        print()

    def to_json(self):
        """Return findings as JSON."""
        return json.dumps({
            'scannedAt': datetime.now().isoformat(),
            'totalFindings': len(self.findings),
            'bySeverity': {
                'HIGH': len([f for f in self.findings if f['severity'] == 'HIGH']),
                'MEDIUM': len([f for f in self.findings if f['severity'] == 'MEDIUM']),
                'LOW': len([f for f in self.findings if f['severity'] == 'LOW']),
            },
            'findings': self.findings,
        }, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description='Scan git history for sensitive data'
    )
    parser.add_argument(
        '--patterns',
        help='Custom regex patterns (pipe-separated)',
        default=None
    )
    parser.add_argument(
        '--since',
        help='Only scan commits since date (e.g., "2024-01-01")',
        default=None
    )
    parser.add_argument(
        '--output',
        choices=['text', 'json'],
        default='text',
        help='Output format'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show progress'
    )

    args = parser.parse_args()

    patterns = None
    if args.patterns:
        patterns = args.patterns.split('|')

    analyzer = GitHistoryAnalyzer(
        patterns=patterns,
        since=args.since,
        verbose=args.verbose
    )

    findings = analyzer.run()

    if args.output == 'json':
        print(analyzer.to_json())
    else:
        analyzer.print_report()

    # Exit with error code if HIGH severity findings
    high_count = len([f for f in findings if f.get('severity') == 'HIGH'])
    sys.exit(1 if high_count > 0 else 0)


if __name__ == '__main__':
    main()
