# Thread-Based Chat System - Workflow Guide

## Overview

The chat system enables internal team coordination between dispatchers, technicians, and admins, as well as direct customer communication through secure magic link authentication.

---

## User Roles & Access

| Role | Access | Capabilities |
|------|--------|--------------|
| **Admin** | Full access | View all threads, create any thread type |
| **Dispatcher** | Full access | Create threads, invite technicians, message customers |
| **Technician** | Limited access | View/respond to threads they're added to |
| **Customer** | Magic link only | View/respond to customer-visible threads for their job |

---

## Thread Types

### 1. Internal Threads
- **Visibility**: Staff only (dispatchers, technicians, admins)
- **Purpose**: Team coordination, job discussions, internal notes
- **Access**: Only participants can view messages

### 2. Customer-Visible Threads
- **Visibility**: Staff AND the customer
- **Purpose**: Direct customer communication about their job
- **Access**: Staff participants + customer via magic link

---

## Staff Workflow (Dispatcher/Technician)

### Accessing Chat
1. Log in to the CRM
2. Click **"Messages"** in the sidebar navigation
3. The chat page displays two tabs: **Active Chats** and **Current Chat**

### Creating a New Thread

#### Internal Thread (Team Only)
1. Click **"New Thread"** button
2. Select **"Internal"** visibility
3. Enter a subject (e.g., "Job #123 - Equipment needed")
4. Select team members to include
5. Optionally link to a specific job
6. Click **"Create Thread"**

#### Customer Thread
1. Click **"New Thread"** button
2. Select **"Customer-Visible"** visibility
3. Enter a subject
4. Select staff participants
5. **Must** link to a job (required for customer access)
6. Click **"Create Thread"**

### Sending Messages
1. Select a thread from the **Active Chats** list
2. The **Current Chat** tab shows the conversation
3. Type your message in the input field
4. Press Enter or click Send

### Unread Indicators
- Red badge on **Messages** sidebar link shows total unread count
- Each thread in Active Chats shows its individual unread count
- Clicking a thread marks all messages as read

---

## Customer Workflow

### How Customers Access Chat

Customers do NOT log into the CRM. They access chat via a secure magic link.

#### Generating a Magic Link (Staff Action)
1. Open the job in the CRM
2. Navigate to the **Messages** section of the job
3. Click **"Send Chat Link"** or **"Generate Magic Link"**
4. The system creates a secure, time-limited token
5. Link is sent to customer via email/SMS

#### Customer Experience
1. Customer clicks the magic link in their email/SMS
2. Link format: `https://yoursite.com/customer/chat?jobId=123&token=abc123...`
3. System validates the token (checks expiry, job association)
4. Customer sees all customer-visible threads for their job
5. Customer can read messages and reply
6. No password or account needed

### Magic Link Security
- Tokens are SHA-256 hashed before storage
- Default expiry: 7 days (configurable)
- Links are job-specific (can't access other jobs)
- IP and user-agent logged for audit trail

---

## Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNAL THREAD                          │
│                                                                 │
│  Dispatcher ◄────────────────────────────► Technician          │
│      │                                          │               │
│      │         (Only staff can see)             │               │
│      │                                          │               │
│      └──────────────► Admin ◄───────────────────┘               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER-VISIBLE THREAD                      │
│                                                                 │
│  Dispatcher ◄──────────────────────────────► Technician        │
│      │                                            │             │
│      │    ┌────────────────────────────────┐     │             │
│      └───►│  CUSTOMER (via magic link)     │◄────┘             │
│           │  - Sees all messages           │                    │
│           │  - Can reply                   │                    │
│           └────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Reference

### Staff Endpoints (Require Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/threads` | List all threads for current user |
| POST | `/api/chat/threads` | Create a new thread |
| GET | `/api/chat/threads/:id/messages` | Get messages in a thread |
| POST | `/api/chat/threads/:id/messages` | Send a message |
| POST | `/api/chat/threads/:id/read` | Mark thread as read |
| POST | `/api/chat/threads/:id/close` | Close a thread |
| GET | `/api/chat/unread-count` | Get total unread count |

### Customer Endpoints (Require Magic Link Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/customer/session` | Validate magic link token |
| GET | `/api/chat/customer/jobs/:jobId/thread` | Get customer's thread |
| POST | `/api/chat/customer/jobs/:jobId/thread/messages` | Customer send message |

### Magic Link Generation (Staff)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/jobs/:jobId/customer-thread` | Create customer-visible thread |
| POST | `/api/chat/jobs/:jobId/customer-session` | Generate magic link for customer |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `chat_threads` | Thread metadata (subject, visibility, status, job link) |
| `chat_thread_participants` | Who can access each thread |
| `chat_messages` | Message content, sender, timestamps |
| `chat_message_read_status` | Track read/unread per user per thread |
| `chat_magic_sessions` | Customer authentication tokens |

---

## Common Scenarios

### Scenario 1: Technician Needs Dispatcher Guidance
1. Technician opens Messages page
2. Creates new **Internal** thread with subject "Need help at Job #456"
3. Adds dispatcher to thread
4. Describes the issue
5. Dispatcher responds with guidance
6. Conversation continues until resolved

### Scenario 2: Customer Has a Question
1. Dispatcher creates **Customer-Visible** thread linked to customer's job
2. Sends magic link to customer via email
3. Customer clicks link, sees the thread
4. Customer types their question
5. Dispatcher (and any technicians on thread) see the message
6. Staff respond; customer sees responses instantly

### Scenario 3: Scheduling Coordination
1. Dispatcher creates Internal thread for job team
2. Adds assigned technician
3. Discusses best time for follow-up visit
4. Technician confirms availability
5. Dispatcher updates the job schedule

---

## Technical Notes

### Real-Time Updates
- Currently uses polling (30-second intervals)
- Messages appear on next poll cycle
- Unread counts update automatically

### Message Deduplication
- Each message has a `client_msg_id` to prevent duplicates
- Useful when network is unreliable

### Audit Trail
- Customer messages log IP address and user-agent
- All messages timestamped
- Thread status changes tracked

---

## Troubleshooting

### Customer Can't Access Chat
- Check if magic link has expired (default 7 days)
- Verify the job ID in the link matches an active job
- Generate a new magic link if needed

### Messages Not Appearing
- Wait for next poll cycle (up to 30 seconds)
- Refresh the page
- Check browser console for errors

### Thread Not Showing for Technician
- Verify technician was added as a participant
- Check thread visibility (internal vs customer-visible)
- Technicians only see threads they're explicitly added to
