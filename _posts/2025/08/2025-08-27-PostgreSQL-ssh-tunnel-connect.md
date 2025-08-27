---
layout: post
title: "How to connect to POstgreSQL on a VPS via SSH tunnel"
date: 2025-08-27 16:55:00 +0800
categories: gather

---

### local run
```
ssh -L 5433:localhost:5432 ca -N
```

```
PGPASSWORD=zz psql -h localhost -U train_btc_user -d train_btc_db -p 5433
```

I'll guide you through connecting to PostgreSQL on a VPS via SSH tunnel. This method provides a secure way to access your database.

## Method 1: Using SSH Command Line (Recommended)

### Basic SSH Tunnel Setup

```bash
# Local port forwarding
ssh -L <local_port>:localhost:<remote_postgres_port> <username>@<vps_ip> -N

# Example:
ssh -L 5433:localhost:5432 user@your-vps-ip.com -N
```

**Explanation:**
- `-L 5433:localhost:5432`: Forward local port 5433 to remote port 5432
- `user@your-vps-ip.com`: Your VPS credentials
- `-N`: Don't execute remote commands (just create the tunnel)

### Connect to PostgreSQL

Once the tunnel is established, connect using:

```bash
# Using psql
psql -h localhost -p 5433 -U your_postgres_user -d your_database

# Using connection string
psql "postgresql://your_postgres_user@localhost:5433/your_database"
```

## Method 2: Persistent SSH Tunnel with AutoSSH

For a more reliable connection that reconnects automatically:

```bash
# Install autossh (if not already installed)
sudo apt install autossh

# Create persistent tunnel
autossh -M 0 -L 5433:localhost:5432 user@your-vps-ip.com -N
```

## Method 3: SSH Config File Setup

Create or edit `~/.ssh/config`:

```ssh-config
Host postgres-tunnel
    HostName your-vps-ip.com
    User your-ssh-user
    LocalForward 5433 localhost:5432
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then simply run:
```bash
ssh -N postgres-tunnel
```

## Method 4: Using GUI Tools

### pgAdmin Setup
1. Create SSH tunnel in pgAdmin connection settings
2. SSH host: your VPS IP
3. SSH username: your SSH user
4. Database host: `localhost` (on the remote server)
5. Database port: `5432`

### DBeaver Setup
1. Create new connection → PostgreSQL
2. In SSH/SSL tab → Enable SSH
3. Fill in SSH credentials and set tunnel host
4. Database connection uses `localhost:5432`

## Advanced: Multiple Databases or Ports

```bash
# Multiple port forwarding
ssh -L 5433:localhost:5432 -L 5434:localhost:5433 user@your-vps-ip.com -N

# Background process with key authentication
ssh -f -N -L 5433:localhost:5432 -i ~/.ssh/your_private_key user@your-vps-ip.com
```

## Security Considerations

### Use SSH Keys Instead of Passwords
```bash
# Generate SSH key if you haven't
ssh-keygen -t rsa -b 4096

# Copy to VPS
ssh-copy-id user@your-vps-ip.com
```

### Restrict PostgreSQL Access
In `postgresql.conf` on your VPS:
```ini
listen_addresses = 'localhost'  # Only listen on localhost
```

In `pg_hba.conf`:
```ini
# Only allow local connections
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

## Troubleshooting Common Issues

### Connection Refused
```bash
# Check if PostgreSQL is running on VPS
ssh user@your-vps-ip.com "sudo systemctl status postgresql"

# Check if PostgreSQL is listening on localhost
ssh user@your-vps-ip.com "netstat -tlnp | grep 5432"
```

### Permission Denied
```bash
# Check PostgreSQL user permissions
ssh user@your-vps-ip.com "sudo -u postgres psql -c '\du'"
```

### Port Already in Use
```bash
# Use a different local port
ssh -L 5434:localhost:5432 user@your-vps-ip.com -N
```

## One-Liner for Quick Connections

```bash
# Connect and create tunnel in one command
ssh -L 5433:localhost:5432 user@your-vps-ip.com -t 'psql -U your_user -d your_db'
```

This method ensures your database connection is securely tunneled through SSH, protecting your data in transit.