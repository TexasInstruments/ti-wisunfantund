#!/bin/sh
if [ $1 -eq 1 ]
 then
  #Remove stale files
  rm -rf /var/local/wisunwebapp
  rm /usr/share/ti_wisun_webapp/public/data.json
  rm /usr/share/ti_wisun_webapp/public/led_states_dict.json
  echo "\n Starting wisunfan webserver service"
  systemctl start ti_wisunfan_webserver.service
  sleep 30
  echo "\n Starting wfantund service"
  systemctl start wfantund.service
  sleep 20
  echo "\n Starting wfanctl service"
  systemctl start wfanctl.service
  exit 0
fi

if [ $1 -eq 0 ]
 then
  echo "\n Stopping webserver service"
  systemctl stop ti_wisunfan_webserver.service
  echo "\n Stopping wfanctl service"
  systemctl stop wfanctl.service
  echo "\n Stopping wfantund service"
  systemctl stop wfantund.service
  exit 0
fi

echo "\n Error: ti_wisunfan_webapp_service called with incorret argument. Call with either 0 (STOP) or 1 (START) service"
