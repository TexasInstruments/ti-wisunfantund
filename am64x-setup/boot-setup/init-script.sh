#! /bin/sh
case "$1" in
  start)
    # Executes web app start script
    sh /usr/share/start-ti-wisun-webapp.sh
    ;;
  *)
    ;;
esac
exit 0