#set -x

if [ $# -eq 0 ]
  then
    echo "Not enough arguments supplied."
    echo "The first argument should be the IP Address of the node you'd like to call a coap GET on."
    echo "For example:"
    echo "./run_coap_get.sh 2020:abcd:0000:0000:0212:4b00:14f7:d2e6"
    exit 1
fi

rm c.bin
echo "Starting the COAP Process with IP Address $1"
coap-client -m get coap://[$1]/led -o c.bin
echo coap-client -m get coap://[$1]/led -o c.bin
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
      echo "Red LED Status: OFF"
    elif [ $first_val == 1 ]
    then
      echo "Red LED Status: ON"
    else
      echo $first_val " is not valid. "
    fi

  elif [ $count == 2 ] 
  then
    second_val=$c
    echo $second_val
    if [ $second_val == 0 ]
    then
      echo "Green LED Status: OFF"
    elif [ $second_val == 1 ]
    then
      echo "Green LED Status: ON"
    else
      echo $second_val " is not valid. "
    fi
  fi
done
