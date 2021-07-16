Known Issues:
=============

1. get connecteddevices, get dodagroute, set dodagroutedest cannot be sent until the stack is up. Sending these commands before would cause wfantund to crash.

1. get connecteddevices should not be called back to back. This will lead to inconsitent results. Recommend to provide atleast 30 s delay for every 10 connected nodes between commands.
