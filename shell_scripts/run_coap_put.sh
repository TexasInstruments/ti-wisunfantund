#set -x
rm c.bin
echo "Starting the COAP Process with IP Address $1 $2 $3"


if [ $# -eq 0 ] || [ $# -eq 1 ] || [ $# -eq 2 ]
  then
    echo "Not enough arguments supplied."
    echo "The first argument should be the IP Address of the node you'd like to communicate with."
    echo "The second argument should be the ID of the LED you would like to use.  (0 = red LED, 1 = green LED)"
    echo "The third argument represents the value you'd like to assign the LED. (0 = off, 1 = on)"
    echo "For example, to turn on the red LED for d2e6:"
    echo "./run_coap_get.sh 2020:abcd:0000:0000:0212:4b00:14f7:d2e6 0 1"
    echo "For example, to turn on the green LED for d2e6:"
    echo "./run_coap_get.sh 2020:abcd:0000:0000:0212:4b00:14f7:d2e6 1 1"
    exit 1
fi


command1="echo -n -e '\x$2\x$3'"
command2=" | "
command3="coap-client -m put 'coap://[$1]/led' -t binary -f- "
command4=$command1$command2$command3
echo $command4
fs_used=$(eval "$command4")
echo $fs_used
echo "Final state of LED is: "
coap-client -m get coap://[$1]/led -o c.bin
hexdump -c c.bin
count=0
first_val=0
second_val=0
hexdump -v -e '/1 "%u\n"' c.bin | while read c; do
  count=$(($count+1))
  if [ $count == 1 ] 
  then
    first_val=$c
    echo $first_val
    if [ $first_val == 0 ]
    then
      echo "Red LED Status: ON"
    elif [ $first_val == 1 ]
    then
      echo "Red LED Status: OFF"
    else
      echo $first_val " is not valid. "
    fi

  elif [ $count == 2 ] 
  then
    second_val=$c
    echo $second_val
    if [ $second_val == 0 ]
    then
      echo "Green LED Status: ON"
    elif [ $second_val == 1 ]
    then
      echo "Green LED Status: OFF"
    else
      echo $second_val " is not valid. "
    fi
  fi
done

