---
layout: post
title: "import the schema on Postgres"
date: 2025-08-31 06:17:00 +0800
categories: gather

---


### Upload the complete_schema.sql file to dababase, then:
  
```
  PGPASSWORD=zz psql -h localhost -U train_btc_v2_user -d train_btc_v2_db -f complete_schema.sql
```

### Check that both tables exist with correct columns

```
  PGPASSWORD=zz psql -h localhost -U train_btc_v2_user -d train_btc_v2_db -c "\dt"
  PGPASSWORD=zz psql -h localhost -U train_btc_v2_user -d train_btc_v2_db -c "\d training_samples"
```

