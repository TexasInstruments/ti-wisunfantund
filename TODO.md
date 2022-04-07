# TODO LIST

This document describes various tasks and features that are wanted or
in-progress.

## General Cleanup/Refactoring Tasks

Not all DBus commands are currently used in `wfanctl`. However, the most prominent
commands are implemented (get, set, status...)

## Security Tasks

Since WPAN Tunnel Driver communicates directly with the dangerous
uncontrolled real-world, additional hardening is warranted. The
following tasks are important for hardening `wfantund` from malicious foes:

- Investigate ways to harden the process by Limiting kernel attackable
  surface-area by using a syscall filter like [`libseccomp`](https://github.com/seccomp/libseccomp).
- Full security audit of code paths which directly interpret data
  from the NCP. Should be performed after the refactoring described
  above.

## Wanted Features/Tasks

- Provide more behavioral logic in the `NCPInstanceBase` class.
