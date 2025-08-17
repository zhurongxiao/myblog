---
layout: post
title: " PostgerSQL migrate "
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
pg_dump -U postgres -h localhost -Fc -f user_comments.dump user_comments
```
  


- pg_dump -Fc creates a custom-format binary dump (.dump file)

```shell
scp user_comments.dump new-sever@xxx/home/
````

### Restore on new server

- Reset "postgres" user password, same as above 👆👆

```shell
# Create database and user
sudo -u postgres psql -c "CREATE DATABASE user_comments;"
sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE user_comments TO app_user;"
```

- Restore using the file you just uploaded

```shell
pg_restore -U postgres -h localhost -d strapi_db -Fc strapi_backup.dump
```
  
### Replenish

- Delete database
```
  sudo -u postgres dropdb strapi_db
```

  
- Create database
```
  sudo -u postgres psql -c "CREATE DATABASE strapi_db;"
```
  
- Qyery database
```
  sudo -u postgres psql -d strapi_db -c "\dt"
```

### Do not clear the database, only overwrite the data (advanced usage)
- If you cannot delete the database (e.g. in a production environment), you can use the --clean option:

```
pg_restore -U postgres -h localhost --clean -d user_comments -Fc user_comments.dump
```
  
- --clean | Delete the object before creating it