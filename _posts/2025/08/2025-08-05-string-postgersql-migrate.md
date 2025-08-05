---
layout: post
title: "Strapi and PostgerSQL migrate "
date: 2025-08-05 14:42:00 +0800
categories: gather
---

### 1.Log in to psql and modify the postgres password

```shell
sudo -u postgres psql
```

### Set a new password for the postgres user

```shell
\password postgres
```


### exit;
```
\q
```

- 1. Backup Your Database on the Old Server
  -   On old server, dump the database
```shell
 
pg_dump -U postgres -h localhost -Fc -f strapi_backup.dump strapi_db

```

- pg_dump -Fc creates a custom-format binary dump (.dump file)

```shell
scp strapi_backup.dump new-sever@xxx/home/
````

### Restore on new server

- Reset "postgres" user password, same as above 👆👆

```shell
# Create database and user
sudo -u postgres psql -c "CREATE DATABASE strapi_db;"
sudo -u postgres psql -c "CREATE USER strapi_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE strapi_db TO strapi_user;"
```

- Restore using the file you just uploaded

```shell
pg_restore -U postgres -h localhost -d strapi_db -Fc strapi_backup.dump
```


