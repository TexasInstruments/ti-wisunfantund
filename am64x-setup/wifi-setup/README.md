# Connecting to WIFI (On the am64x)

## wpa_supplicant configuration

To connect to Enterprise networks, we will be using `wpa_supplicant`.
First, edit `wpa_supplicant.conf`, inputting your network name in the `<network name>`
placeholder, as well as inputting your username and hashed password into
`<username>` and `<hashed password>` placeholders. To hash your password,
check out [Hashing your password](#hashing-your-password) below. If you would
like to input your raw password instead, just set the password field as follows:
`password="<password>"`

### Hashing your password

To hash your password run _(On a linux machine with openssl installed)_:

```
iconv -t utf16le | openssl md4
```

After invoking the command above, provide your plain password and then press `Ctrl+d`.
The output is your hashed password.

### Copying configuration file

After editing `wpa_supplicant.conf`, copy it into its correct directory with:

```
cp wpa_supplicant.conf /etc/wpa_supplicant.conf
```

Now you are ready to run wpa_supplicant and use the wpa_cli

## Connecting to WIFI

After doing the above configuration, run:

```
./wifi-setup.sh
```

After about 15 seconds or so, if connection was successful, you should see
`CTRL-EVENT-CONNECTED`. Exit out of the wpa_cli with `Ctrl+c` and then, to
make sure that you are connected to your network, test by pinging google.com with:

```
ping google.com
```

If you see responses received, you are connected!
