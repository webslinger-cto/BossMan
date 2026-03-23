#!/bin/bash

# BossMan Sales Content Email Sender
# Sends weekly sales content to Rashad's email

GMAIL_USER="rabdulsalaam@gmail.com"
GMAIL_PASS="suhyyijiosemjicg"
TO_EMAIL="rabdulsalaam@gmail.com"

send_email() {
    local subject="$1"
    local body="$2"
    local email_file="/tmp/bossman_email_$(date +%s).txt"

    cat > "$email_file" << EOF
From: $GMAIL_USER
To: $TO_EMAIL
Subject: $subject
Content-Type: text/plain; charset=UTF-8

$body
EOF

    curl --silent --ssl-reqd \
        --mail-from "$GMAIL_USER" \
        --mail-rcpt "$TO_EMAIL" \
        --url "smtps://smtp.gmail.com:465" \
        --user "$GMAIL_USER:$GMAIL_PASS" \
        --upload-file "$email_file"

    local result=$?
    rm -f "$email_file"
    
    if [ $result -eq 0 ]; then
        echo "✅ BossMan sales content sent to $TO_EMAIL"
        return 0
    else
        echo "❌ Failed to send email (curl exit code: $result)"
        return 1
    fi
}

# Export function for use by other scripts
export -f send_email