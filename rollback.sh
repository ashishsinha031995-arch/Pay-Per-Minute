#!/bin/bash

# Clear terminal screen
clear

echo "=========================================================="
echo "⚡  INTERACTIVE ROLLBACK & BACKUP UTILITY"
echo "=========================================================="
echo "Choose which checkpoint you want to restore your files to:"
echo ""
echo "  [1] Restore to Pre-Notification State (Original standard app)"
echo "  [2] Restore to V1 Stable State (With mobile responsive + active notifications)"
echo "  [3] Cancel & Exit"
echo ""
echo "=========================================================="
read -p "Select an option (1-3): " option

FRONTEND_DIR="./frontend"

case $option in
  1)
    echo ""
    echo "🔄 Restoring Pre-Notification State..."
    BACKUP_DIR="./backups/before-notifications"
    
    if [ ! -d "$BACKUP_DIR" ]; then
      echo "❌ Error: Backup directory '$BACKUP_DIR' not found!"
      exit 1
    fi

    # Restore original files
    if [ -f "$BACKUP_DIR/IncomingRequestNotification.tsx" ]; then
      cp "$BACKUP_DIR/IncomingRequestNotification.tsx" "$FRONTEND_DIR/src/components/IncomingRequestNotification.tsx"
      echo "✅ Restored: IncomingRequestNotification.tsx (Original layout)"
    fi

    if [ -f "$BACKUP_DIR/ChatRoom.tsx" ]; then
      cp "$BACKUP_DIR/ChatRoom.tsx" "$FRONTEND_DIR/src/components/modals/ChatRoom.tsx"
      echo "✅ Restored: ChatRoom.tsx (Original layout)"
    fi

    if [ -f "$BACKUP_DIR/main.tsx" ]; then
      cp "$BACKUP_DIR/main.tsx" "$FRONTEND_DIR/src/main.tsx"
      echo "✅ Restored: main.tsx"
    fi

    if [ -f "$FRONTEND_DIR/public/sw.js" ]; then
      rm -f "$FRONTEND_DIR/public/sw.js"
      echo "✅ Removed: sw.js (Service Worker)"
    fi
    ;;

  2)
    echo ""
    echo "🔄 Restoring V1 Stable State (With mobile responsive & active notifications)..."
    BACKUP_DIR="./backups/v1-stable-with-notifications"
    
    if [ ! -d "$BACKUP_DIR" ]; then
      echo "❌ Error: Backup directory '$BACKUP_DIR' not found!"
      exit 1
    fi

    # Restore V1 stable files
    if [ -f "$BACKUP_DIR/IncomingRequestNotification.tsx" ]; then
      cp "$BACKUP_DIR/IncomingRequestNotification.tsx" "$FRONTEND_DIR/src/components/IncomingRequestNotification.tsx"
      echo "✅ Restored: IncomingRequestNotification.tsx (V1 Stable)"
    fi

    if [ -f "$BACKUP_DIR/ChatRoom.tsx" ]; then
      cp "$BACKUP_DIR/ChatRoom.tsx" "$FRONTEND_DIR/src/components/modals/ChatRoom.tsx"
      echo "✅ Restored: ChatRoom.tsx (V1 Stable)"
    fi

    if [ -f "$BACKUP_DIR/main.tsx" ]; then
      cp "$BACKUP_DIR/main.tsx" "$FRONTEND_DIR/src/main.tsx"
      echo "✅ Restored: main.tsx (V1 Stable)"
    fi

    if [ -f "$BACKUP_DIR/sw.js" ]; then
      cp "$BACKUP_DIR/sw.js" "$FRONTEND_DIR/public/sw.js"
      echo "✅ Restored: sw.js (Service Worker)"
    fi
    ;;

  *)
    echo "❌ Operation cancelled."
    exit 0
    ;;
esac

echo ""
echo "⚙️  Rebuilding application build to apply changes..."
npm run build

echo ""
echo "🎉 ROLLBACK COMPLETED SUCCESSFULLY!"
echo "=========================================================="
