# Deploy (Bangmod) — Vendia API

เอกสารนี้ใช้สำหรับอัปเดตโค้ดฝั่ง API (Laravel) บนเครื่อง Bangmod ที่มีแค่ API + Database

## อัปเดตโค้ดจาก Git (แนะนำแบบไม่ force)

```bash
cd /var/www/vendia
git fetch --all --prune
git pull --ff-only origin main
```

ถ้า pull ไม่ผ่านเพราะมีไฟล์ค้าง/ไฟล์ untracked บน server:

```bash
cd /var/www/vendia
git stash -u
git pull --ff-only origin main
```

## ติดตั้ง dependency + migrate + เคลียร์ cache (หลัง pull ทุกครั้ง)

```bash
cd /var/www/vendia/vendia-api
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
```

รีสตาร์ทบริการ (ให้เลือกอันที่มีในเครื่อง):

```bash
sudo systemctl restart php8.3-fpm || sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
```

## Force ให้เหมือนบน Git 100% (ลบทิ้ง local ทั้งหมด)

ใช้เฉพาะกรณีต้องการทิ้งงานบน server จริง ๆ

```bash
cd /var/www/vendia
git fetch --all --prune
git reset --hard origin/main
git clean -fd
```

## Migrate แบบ “ไม่ให้ข้อมูลเดิมหาย” (Production-safe)

หลักการ:

- เวลาเพิ่มตาราง/เพิ่มคอลัมน์/แก้โครงสร้าง ให้ “สร้าง migration ใหม่” เสมอ
- ใช้ `php artisan migrate --force` เท่านั้น
- ห้ามใช้ `migrate:fresh` / `migrate:refresh` บนเครื่องที่มีข้อมูลจริง เพราะจะลบทิ้งแล้วสร้างใหม่

### เพิ่ม schema ใหม่โดยไม่ลบข้อมูลเดิม

1) สร้าง migration ใหม่ (ทำในเครื่อง dev แล้วค่อย push ขึ้น git)

ตัวอย่างเพิ่มคอลัมน์:

```bash
cd vendia-api
php artisan make:migration add_attendance_office_ips_to_shops_table --table=shops
```

2) เขียน `up()` ให้เป็น “เพิ่ม/แก้” เท่านั้น (อย่า drop table ถ้าไม่จำเป็น)

3) push ขึ้น git แล้วบน server รัน:

```bash
cd /var/www/vendia/vendia-api
php artisan migrate --force
```

### เช็คว่า migration ไหนรันแล้วบ้าง

```bash
cd /var/www/vendia/vendia-api
php artisan migrate:status
```

### ถ้ารัน migration แล้วพัง ต้องทำยังไง

- ปกติควรแก้ migration ที่รันไปแล้ว “ด้วย migration ใหม่” แทนการแก้ไฟล์เก่า
- ถ้าจำเป็นต้อง rollback (เฉพาะตอนยังไม่ใช้งานจริง/มั่นใจผลกระทบ):

```bash
php artisan migrate:rollback --step=1 --force
```

## Seed (ข้อมูลเริ่มต้น)

ใช้เพื่อสร้าง user/ข้อมูลตั้งต้นเท่านั้น:

```bash
cd /var/www/vendia/vendia-api
php artisan db:seed --force
```

หมายเหตุ: บน production ระวัง seeder ที่ “สร้างข้อมูลสุ่ม” หรือ “รีเซ็ตข้อมูล” (ควรปิดไว้)

## ปัญหา SQLite เขียนไม่ได้ (attempt to write a readonly database)

ถ้าใช้ SQLite และเจอ error เขียน DB ไม่ได้ ให้แก้ permission:

```bash
cd /var/www/vendia/vendia-api
sudo chown -R www-data:www-data database
sudo chmod 775 database
sudo chmod 664 database/database.sqlite
```

## Permission ที่ Laravel ต้องเขียน

```bash
cd /var/www/vendia/vendia-api
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwX storage bootstrap/cache
sudo find storage bootstrap/cache -type d -exec chmod g+s {} \;
```
