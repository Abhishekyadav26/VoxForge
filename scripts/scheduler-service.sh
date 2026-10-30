#!/usr/bin/env bash
# Run the VoxForge scheduler in the background.
#   scripts/scheduler-service.sh start | stop | status | logs
# Logs: .run/scheduler.log   PID: .run/scheduler.pid
set -euo pipefail
cd "$(dirname "$0")/.."
RUN_DIR=".run"; PID_FILE="$RUN_DIR/scheduler.pid"; LOG_FILE="$RUN_DIR/scheduler.log"
mkdir -p "$RUN_DIR"

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

case "${1:-status}" in
  start)
    if is_running; then echo "already running (pid $(cat "$PID_FILE"))"; exit 0; fi
    # setsid detaches from this terminal so closing it does not stop the scheduler.
    setsid nohup npx tsx scripts/scheduler.ts >> "$LOG_FILE" 2>&1 < /dev/null &
    echo $! > "$PID_FILE"
    sleep 2
    if is_running; then echo "started (pid $(cat "$PID_FILE")), log: $LOG_FILE"; else echo "failed to start, see $LOG_FILE"; exit 1; fi
    ;;
  stop)
    if is_running; then
      # setsid made the PID a process-group leader. Signal the whole group so
      # npx/sh/node children stop too, not just the wrapper.
      pgid="$(cat "$PID_FILE")"
      kill -TERM -- "-$pgid" 2>/dev/null || kill -TERM "$pgid" 2>/dev/null || true
      sleep 2
      kill -0 "$pgid" 2>/dev/null && kill -KILL -- "-$pgid" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "stopped"
    else
      rm -f "$PID_FILE"; echo "not running"
    fi
    ;;
  status)
    if is_running; then echo "running (pid $(cat "$PID_FILE"))"; else echo "not running"; fi
    ;;
  logs)
    tail -n 40 -f "$LOG_FILE"
    ;;
  *)
    echo "usage: $0 start|stop|status|logs"; exit 2 ;;
esac
