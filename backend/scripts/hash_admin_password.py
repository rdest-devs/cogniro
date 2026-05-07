"""Generate a bcrypt hash for the admin password environment variable."""

from __future__ import annotations

import argparse
import getpass
import sys

import bcrypt


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate an ADMIN_PASSWORD_HASH value for backend/.env.",
    )
    parser.add_argument(
        "--rounds",
        default=12,
        type=int,
        help="bcrypt cost factor to use (default: 12)",
    )
    args = parser.parse_args(argv)
    if not 4 <= args.rounds <= 31:
        parser.error(
            "argument --rounds: bcrypt cost factor must be between 4 and 31 inclusive "
            f"(got {args.rounds})",
        )
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    password = getpass.getpass("Admin password: ")
    if not password:
        print("Admin password cannot be empty.", file=sys.stderr)
        return 1

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=args.rounds),
    )
    print(password_hash.decode("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
