#!/bin/bash

PHP_SERVER_ROOT="public"
PHP_LOGGING_PATH="log/server"

if [ ! -e "notes" ]; then
  echo "Notes directory not found. Please create a 'notes' directory."
  echo "Create directory or symbolic link to 'notes' from another location."
  exit 1
fi

start_server() {
  nohup php -S 0.0.0.0:8888 -t ${PHP_SERVER_ROOT} > ${PHP_LOGGING_PATH}.log 2>&1 &
  echo "PHP server started on http://<ip>:8888 (PID: $!)"
  echo $! > ${PHP_LOGGING_PATH}.pid
}

stop_server() {
  if [ -f ${PHP_LOGGING_PATH}.pid ]; then
    PID=$(cat ${PHP_LOGGING_PATH}.pid)
    kill -9 $PID
    rm ${PHP_LOGGING_PATH}.pid
    echo "PHP server stopped (PID: $PID)"
  else
    echo "No running PHP server found"
  fi
}

case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    sleep 1
    start_server
    ;;
  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac

exit 0