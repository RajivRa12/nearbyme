import re

with open("apps/master_admin/management/commands/seed_master_admin.py", "r") as f:
    content = f.read()

addition = """
        # --- ADDED: Dummy Store Admin User ---
        manager_user, _ = User.objects.get_or_create(
            username="manager@nearbyme.com",
            defaults={
                "email": "manager@nearbyme.com",
                "first_name": "Store",
                "last_name": "Manager",
                "role": Role.BRAND_OWNER,
            }
        )
        manager_user.is_active = True
        manager_user.set_password("password123")
        manager_user.save()
        self.stdout.write(self.style.SUCCESS("✔ Seeded Store Admin: manager@nearbyme.com / password123"))
"""

if "manager@nearbyme.com" not in content:
    content = content.replace(
        "self.stdout.write(self.style.SUCCESS(\"✔ Seeded 3 Internal Executive Users + 'admin' superuser with admin portal access.\"))",
        "self.stdout.write(self.style.SUCCESS(\"✔ Seeded 3 Internal Executive Users + 'admin' superuser with admin portal access.\"))" + addition
    )
    with open("apps/master_admin/management/commands/seed_master_admin.py", "w") as f:
        f.write(content)
    print("Patched successfully")
