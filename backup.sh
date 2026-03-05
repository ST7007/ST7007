#!/bin/bash

# ================= CONFIG =================
PROJECT="/Users/jesus/st7007"
DBFILE="$PROJECT/database.sqlite"
TMPDB="/Users/jesus/temp.sqlite"
DATE=$(date +%Y-%m-%d-%H%M)
BACKUP="$PROJECT/st7007-$DATE.zip"
GDRIVE_REMOTE="gdrive:st7007-backups"   # Make sure this folder exists in your Google Drive
# ========================================

# 1️⃣ Make a safe copy of database
sqlite3 $DBFILE ".backup '$TMPDB'"

# 2️⃣ Create zip of project + database copy
zip -r $BACKUP $PROJECT $TMPDB

# 3️⃣ Upload to Google Drive
rclone copy $BACKUP $GDRIVE_REMOTE

# 4️⃣ Remove temporary files
rm $BACKUP
#!/bin/bash

# ================= CONFIG =================
PROJECT="/Users/jesus/st7007"
DBFILE="$PROJECT/database.sqlite"
TMPDB="/Users/jesus/temp.sqlite"
DATE=$(date +%Y-%m-%d-%H%M)
BACKUP="$PROJECT/st7007-$DATE.zip"
GDRIVE_REMOTE="gdrive:st7007-backups"
MAX_BACKUPS=7   # Keep last 7 backups
# ========================================

# 1️⃣ Create a safe copy of database
sqlite3 "$DBFILE" ".backup '$TMPDB'"

# 2️⃣ Zip project folder + database copy
zip -r "$BACKUP" "$PROJECT" "$TMPDB"

# 3️⃣ Upload to Google Drive
rclone copy "$BACKUP" "$GDRIVE_REMOTE"

# 4️⃣ Remove local temporary files
rm "$BACKUP"
rm "$TMPDB"

# 5️⃣ Optional: keep only last $MAX_BACKUPS backups on Google Drive
rclone lsf --sort newest "$GDRIVE_REMOTE" | awk "NR>$MAX_BACKUPS" | while read f; do
    rclone delete "$GDRIVE_REMOTE/$f"
donerm $TMPDB
