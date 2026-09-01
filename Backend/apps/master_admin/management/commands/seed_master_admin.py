import csv
import os
import random
import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.core.models import (
    InternalUser, InternalUserRole,
    Plan, AccessCode, AccessCodeRedemption,
    StoreGroup, StoreGroupStatus, StoreGroupType,
    City, Zone, Outlet, StoreStatusHistory,
    ServiceCategoryPhase1, CanonicalService, StoreService, StoreServiceMarketplaceStatus,
    GlobalCustomer, CustomerStatus, CustomerStoreLink, CustomerLifecycleStage,
    AuditLog, Business, Brand, Store, Role, Appointment, AppointmentStatus, Invoice, InvoiceStatus
)
User = get_user_model()
class Command(BaseCommand):
    help = (
        "Seeds database for Master Admin Phase 1 testing and QA.\n"
        "Creates 3 internal users, 10 categories & 53 canonical services from seed-services.csv, "
        "4 plans, 10 access codes, 20 test store groups across all lifecycle statuses, and 50 global/walk-in customers."
    )
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing Phase 1 seeded data before seeding',
        )
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting Master Admin Phase 1 Seed Process..."))
        if options['clear']:
            self.stdout.write(self.style.WARNING("Clearing existing Phase 1 records..."))
            Appointment.objects.filter(outlet__isnull=False).delete()
            Invoice.objects.filter(outlet__isnull=False).delete()
            for model in [CustomerStoreLink, GlobalCustomer, StoreService, CanonicalService, ServiceCategoryPhase1, Outlet, StoreGroup, AccessCode, Plan, InternalUser]:
                if hasattr(model, 'all_objects'):
                    model.all_objects.all().delete()
                else:
                    model.objects.all().delete()
            StoreStatusHistory.objects.all().delete()
            AccessCodeRedemption.objects.all().delete()
            Zone.objects.all().delete()
            City.objects.all().delete()
            AuditLog.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Cleaned previous seed data."))
        cities_data = [
            ("Bengaluru", "Karnataka", ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Lavelle Road"]),
            ("Mumbai", "Maharashtra", ["Bandra West", "Juhu", "Lower Parel", "Powai", "Colaba"]),
            ("Hyderabad", "Telangana", ["Jubilee Hills", "Banjara Hills", "Madhapur", "Gachibowli", "Hitec City"]),
            ("New Delhi", "Delhi", ["Connaught Place", "Khan Market", "South Extension", "Vasant Vihar", "Greater Kailash"])
        ]
        cities_map = {}
        all_zones = []
        for c_name, c_state, z_list in cities_data:
            city, _ = City.objects.get_or_create(name=c_name, state=c_state, is_active=True)
            cities_map[c_name] = city
            for z_name in z_list:
                zone, _ = Zone.objects.get_or_create(city=city, name=z_name, is_active=True)
                all_zones.append(zone)
        self.stdout.write(self.style.SUCCESS(f"✔ Seeded {len(cities_map)} Metropolitan Cities and {len(all_zones)} Commercial Zones."))
        internal_roles_map = [
            ("superadmin@nearbyme.in", "Alice Shrivastava (VP Operations)", "+919876543001", InternalUserRole.SUPERADMIN),
            ("ops@nearbyme.in", "Boban Mathew (Platform Lead)", "+919876543002", InternalUserRole.OPS),
            ("reviewer@nearbyme.in", "Charles DSouza (Head of Onboarding)", "+919876543003", InternalUserRole.REVIEWER),
        ]
        internal_users = []
        for email, name, phone, role in internal_roles_map:
            iu, _ = InternalUser.objects.get_or_create(
                email=email,
                defaults={"name": name, "phone": phone, "role": role, "is_active": True}
            )
            internal_users.append(iu)
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": name.split()[0],
                    "last_name": name.split()[-1] if len(name.split()) > 1 else "",
                }
            )
            user.is_active = True
            user.is_staff = True
            user.is_superuser = (role == InternalUserRole.SUPERADMIN)
            user.set_password("Password123!")
            user.save()
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@nearbyme.in", "first_name": "Master", "last_name": "Admin"}
        )
        admin_user.is_active = True
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.set_password("admin")
        admin_user.save()
        InternalUser.objects.get_or_create(
            email="admin@nearbyme.in",
            defaults={"name": "Master Admin Dev", "phone": "+919999999999", "role": InternalUserRole.SUPERADMIN, "is_active": True}
        )
        self.stdout.write(self.style.SUCCESS("✔ Seeded 3 Internal Executive Users + 'admin' superuser with admin portal access."))
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

        plans_data = [
            ("Pilot", 0, "monthly", 1, 3, {"custom_services": True, "sms": False}),
            ("Solo", 199900, "monthly", 1, 5, {"custom_services": True, "sms": True}),
            ("Growth", 499900, "monthly", 3, 20, {"custom_services": True, "sms": True, "api_access": True}),
            ("Chain", 1499900, "monthly", 25, 150, {"custom_services": True, "sms": True, "api_access": True, "multi_outlet": True}),
        ]
        plans = []
        for p_name, p_price, p_billing, p_outlets, p_profs, p_flags in plans_data:
            plan, _ = Plan.objects.get_or_create(
                name=p_name,
                defaults={
                    "price_paise": p_price,
                    "billing_period": p_billing,
                    "outlet_limit": p_outlets,
                    "professional_limit": p_profs,
                    "feature_flags": p_flags,
                    "is_active": True
                }
            )
            plans.append(plan)
        self.stdout.write(self.style.SUCCESS(f"✔ Seeded {len(plans)} Subscription Plans with integer paise pricing."))
        code_sources = [
            ("BLR-PILOT-A7X2", plans[0], 30, 50, "Direct-Sales-Bangalore"),
            ("BLR-SOLO-9K3M", plans[1], 30, 25, "Instagram-Ad-Campaign"),
            ("BLR-GROW-8B4P", plans[2], 60, 10, "Partner-Referral-Luxe"),
            ("DEL-PILOT-3T8R", plans[0], 30, 100, "Delhi-Beauty-Expo-2026"),
            ("MUM-CHAIN-7L2N", plans[3], 90, 5, "Mumbai-Enterprise-Inbound"),
            ("BLR-PILOT-X9M1", plans[0], 30, 20, "Field-Executive-Koramangala"),
            ("BLR-SOLO-P4Q2", plans[1], 45, 15, "Email-Nurture-Sequence"),
            ("HYD-GROW-W2Y5", plans[2], 30, 10, "Hyderabad-Spa-Association"),
            ("PUN-SOLO-E5R7", plans[1], 30, 30, "Direct-Sales-Pune"),
            ("BLR-PILOT-Z1D9", plans[0], 14, 200, "Website-Organic-Signup")
        ]
        access_codes = []
        for c_str, c_plan, c_dur, c_max, c_source in code_sources:
            ac, _ = AccessCode.objects.get_or_create(
                code=c_str,
                defaults={
                    "plan": c_plan,
                    "duration_days": c_dur,
                    "max_redemptions": c_max,
                    "redemption_count": random.randint(1, min(10, c_max)),
                    "expires_at": timezone.now() + timedelta(days=c_dur),
                    "issued_by": "Alice Shrivastava",
                    "source_tag": c_source,
                    "status": "active"
                }
            )
            access_codes.append(ac)
        self.stdout.write(self.style.SUCCESS(f"✔ Seeded {len(access_codes)} Enterprise Access Codes."))
        csv_path = os.path.join(settings.BASE_DIR, 'seed-services.csv')
        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f"CSV file not found at {csv_path}. Cannot import service taxonomy!"))
            return
        categories_map = {}
        services_count = 0
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                cat_slug = row['category_slug'].strip()
                if cat_slug not in categories_map:
                    cat, _ = ServiceCategoryPhase1.objects.get_or_create(
                        slug=cat_slug,
                        defaults={
                            "name": row['category_name'].strip(),
                            "applies_to": row['applies_to'].strip(),
                            "display_order": int(row['display_order']),
                            "is_active": True
                        }
                    )
                    categories_map[cat_slug] = cat
                cat_obj = categories_map[cat_slug]
                serv_slug = row['service_slug'].strip()
                res_type = row['resource_type'].strip()
                CanonicalService.objects.get_or_create(
                    slug=serv_slug,
                    defaults={
                        "category": cat_obj,
                        "name": row['service_name'].strip(),
                        "default_duration_min": int(row['default_duration_min']),
                        "buffer_before_min": int(row['buffer_before_min']),
                        "buffer_after_min": int(row['buffer_after_min']),
                        "resource_type": res_type,
                        "gender_applicability": row['gender_applicability'].strip(),
                        "skill_tag": row['skill_tag'].strip(),
                        "is_active": True
                    }
                )
                services_count += 1
        self.stdout.write(self.style.SUCCESS(
            f"✔ Imported Real Service Taxonomy: {len(categories_map)} Categories & {services_count} Canonical Services from seed-services.csv."
        ))
        statuses = [
            StoreGroupStatus.APPLIED, StoreGroupStatus.UNDER_REVIEW, StoreGroupStatus.APPROVED,
            StoreGroupStatus.ACTIVE, StoreGroupStatus.ACTIVE, StoreGroupStatus.ACTIVE,
            StoreGroupStatus.SUSPENDED, StoreGroupStatus.DORMANT, StoreGroupStatus.OFFBOARDED
        ]
        salon_businesses = [
            ("Green Trends Unisex Styling", "Green Trends Wellness Private Limited", "Rajeshwari Subramanian", "+919845012345", "rajeshwari@greentrends.in", "29AABCD1234E1Z5", "AABCD1234E", StoreGroupType.SALON, "Bengaluru", "Indiranagar", "560038"),
            ("Bodycraft Luxury Wellness & Spa", "Bodycraft Healthcare & Aesthetics Pvt Ltd", "Manika Nanda", "+919845123456", "m.nanda@bodycraft.co.in", "29AABFB5678G1Z2", "AABFB5678G", StoreGroupType.BOTH, "Bengaluru", "Lavelle Road", "560001"),
            ("Toni & Guy Hair Academy & Lounge", "Toni and Guy South India Retail Pvt Ltd", "Bhavin Karia", "+919845234567", "bhavin@toniandguy.in", "29AACFT9012H1Z8", "AACFT9012H", StoreGroupType.SALON, "Bengaluru", "Koramangala", "560034"),
            ("O2 Thai Therapy & Thai Healing Spa", "O2 Organic Therapies LLP", "Ananya Singhania", "+919845345678", "ananya@o2thaispa.com", "27AADDE3456J1Z1", "AADDE3456J", StoreGroupType.SPA, "Mumbai", "Bandra West", "400050"),
            ("Lakmé Salon Luxe Studio", "Lakme Lever Retail Studios Ltd", "Devangana Sreedhar", "+919845456789", "devangana@lakmesalon.in", "29AABCL6789K1Z4", "AABCL6789K", StoreGroupType.SALON, "Bengaluru", "Whitefield", "560066"),
            ("Urban Nirvana Holistic Spa", "Nirvana Wellbeing Hospitality LLP", "Vikram Khandelwal", "+919845567890", "vikram@urbannirvana.co", "29AAEEN4321L1Z9", "AAEEN4321L", StoreGroupType.SPA, "Bengaluru", "HSR Layout", "560102"),
            ("Bounce Hair & Professional Grooming", "Bounce Grooming Enterprises Pvt Ltd", "Prashanto Bannerjee", "+919845678901", "prashanto@bounce.in", "29AAFFB8765M1Z3", "AAFFB8765M", StoreGroupType.SALON, "Bengaluru", "Indiranagar", "560038"),
            ("Jean-Claude Biguine Salon & Spa", "JCB Luxury Aesthetic Clinics India Ltd", "Dharmesh Shah", "+919845789012", "dharmesh.shah@jcbindia.in", "27AABCT2345N1Z6", "AABCT2345N", StoreGroupType.BOTH, "Mumbai", "Juhu", "400049"),
            ("YLG Bridal Salon & Skin Sanctuary", "You Look Great Beauty Pvt Ltd", "Vaijayanthi Bhasin", "+919845890123", "v.bhasin@ylg.co.in", "29AAGGY7890P1Z2", "AAGGY7890P", StoreGroupType.SALON, "Bengaluru", "Koramangala", "560095"),
            ("Meghavi Luxury Wellness Retreat", "Meghavi Hospitality Private Limited", "Prakash Govindarajan", "+919845901234", "prakash@meghaviwellness.com", "36AABCM4567Q1Z7", "AABCM4567Q", StoreGroupType.SPA, "Hyderabad", "Jubilee Hills", "500033"),
            ("Envi Unisex Hair & Skin Boutique", "Envi Aesthetic Retailers LLP", "Sunil Motwani", "+919846012345", "sunil@envisalon.in", "27AAGFE9876R1Z4", "AAGFE9876R", StoreGroupType.SALON, "Mumbai", "Lower Parel", "400013"),
            ("Four Fountains De-stress Spa", "FF Health & Wellness Services Pvt Ltd", "Nupur Talwar", "+919846123456", "nupur@fourfountains.in", "27AAHFH5432S1Z8", "AAHFH5432S", StoreGroupType.SPA, "Mumbai", "Powai", "400076"),
            ("Nail & Lash Bar by Prestige", "Prestige Styling Studios Private Limited", "Tanya Dsouza", "+919846234567", "tanya@naillashbar.in", "29AAIIJ1234T1Z1", "AAIIJ1234T", StoreGroupType.SALON, "Bengaluru", "Lavelle Road", "560001"),
            ("Ayurvedic Bliss Panchakarma Sanctuary", "Vedic Heritage Remedies LLP", "Dr. Sankarshana Sharma", "+919846345678", "dr.sharma@ayurbliss.in", "29AABCA9012U1Z5", "AABCA9012U", StoreGroupType.SPA, "Bengaluru", "HSR Layout", "560102"),
            ("Vibe Professional Grooming Collective", "Vibe Hair Collective Pvt Ltd", "Zainab Khorakiwala", "+919846456789", "zainab@vibestudio.co", "27AAJKV4567V1Z9", "AAJKV4567V", StoreGroupType.SALON, "Mumbai", "Bandra West", "400050"),
            ("Zenya Japanese Onsen & Day Spa", "Zenya Global Wellbeing Private Ltd", "Nehal Thakkar", "+919846567890", "nehal@zenyasanctuary.com", "27AABCS6543W1Z2", "AABCS6543W", StoreGroupType.SPA, "Mumbai", "Colaba", "400005"),
            ("Truefitt & Hill Classic Barbering", "Lloyds Luxuries Retail Pvt Ltd", "Istayak Ansari", "+919846678901", "istayak@truefittandhill.in", "27AAKTL7890X1Z6", "AAKTL7890X", StoreGroupType.SALON, "Mumbai", "Colaba", "400021"),
            ("Sukra Holistic Healing Sanctuary", "Sukra Wellness Collective LLP", "Meena Krishnan", "+919846789012", "meena@sukrahealing.in", "36AALMS3456Y1Z9", "AALMS3456Y", StoreGroupType.SPA, "Hyderabad", "Banjara Hills", "500034"),
            ("Studio 11 Boutique Salon & Spa", "Studio 11 Styling Hub LLP", "Venkata Sai Ram", "+919846890123", "sairam@studio11salon.in", "36AABCS2109Z1Z3", "AABCS2109Z", StoreGroupType.BOTH, "Hyderabad", "Madhapur", "500081"),
            ("Serendipity Med-Spa & Clinic", "Serendipity Skincare India Pvt Ltd", "Kabir Bedi", "+919846901234", "kabir@serendipityclinic.co.in", "07AAQQP5678A1Z7", "AAQQP5678A", StoreGroupType.BOTH, "New Delhi", "Connaught Place", "110001")
        ]
        canonical_all = list(CanonicalService.objects.all())
        store_groups = []
        for idx, (s_name, l_name, o_name, o_phone, o_email, gstin_val, pan_val, b_type, city_name, zone_name, pin_code) in enumerate(salon_businesses):
            assigned_status = statuses[idx % len(statuses)]
            assigned_plan = plans[idx % len(plans)]
            assigned_code = access_codes[idx % len(access_codes)] if assigned_status in [StoreGroupStatus.APPROVED, StoreGroupStatus.ACTIVE] else None
            sg, created = StoreGroup.objects.get_or_create(
                name=s_name,
                defaults={
                    "legal_name": l_name,
                    "owner_name": o_name,
                    "owner_phone": o_phone,
                    "owner_email": o_email,
                    "gstin": gstin_val,
                    "pan": pan_val,
                    "business_type": b_type,
                    "status": assigned_status,
                    "plan": assigned_plan,
                    "access_code": assigned_code,
                    "term_start": timezone.now() - timedelta(days=random.randint(10, 60)) if assigned_code else None,
                    "term_end": timezone.now() + timedelta(days=random.randint(30, 90)) if assigned_code else None,
                    "approved_at": timezone.now() - timedelta(days=30) if assigned_status not in [StoreGroupStatus.APPLIED, StoreGroupStatus.UNDER_REVIEW] else None
                }
            )
            store_groups.append(sg)
            if created:
                city_obj = cities_map.get(city_name, list(cities_map.values())[0])
                outlet_zone = Zone.objects.filter(city=city_obj, name=zone_name).first() or all_zones[0]
                Outlet.objects.create(
                    store_group=sg,
                    name=f"{s_name} - {zone_name} Studio",
                    address_line=f"Unit {101+idx}, Luxury Retail Arcade, Main Boulevard, {zone_name}",
                    city=city_obj,
                    zone=outlet_zone,
                    pincode=pin_code,
                    phone=f"+9198470000{idx:02d}",
                    opening_time="09:00:00",
                    closing_time="21:00:00",
                    status="active" if assigned_status == StoreGroupStatus.ACTIVE else "inactive"
                )
                StoreStatusHistory.objects.create(
                    store_group=sg,
                    from_status="applied",
                    to_status=assigned_status,
                    reason="Enterprise vendor verification and KYC approval completed.",
                    changed_by="Alice Shrivastava" if assigned_status != StoreGroupStatus.DORMANT else "Automated Inactivity Auditor",
                    changed_by_type="internal_user" if assigned_status != StoreGroupStatus.DORMANT else "system"
                )
                if assigned_status == StoreGroupStatus.ACTIVE and canonical_all:
                    sample_parent = random.choice(canonical_all)
                    StoreService.objects.create(
                        store_group=sg,
                        canonical_service=sample_parent,
                        name=f"Signature {sample_parent.name}",
                        default_price_paise=random.choice([149900, 249900, 349900, 499900, 699900]),
                        duration_min=sample_parent.default_duration_min + 15,
                        is_active_in_store=True,
                        marketplace_status=StoreServiceMarketplaceStatus.PENDING
                    )
        self.stdout.write(self.style.SUCCESS(f"✔ Seeded {len(store_groups)} Authentic Store Groups (across all 7 statuses) with Outlets & Status Histories."))
        real_customers = [
            ("Aarav Shinde", "aarav.shinde.wk@gmail.com", "+919811012001", True),
            ("Aditi Krishnan", "aditi.krishnan@outlook.com", "+919811012002", True),
            ("Rohan Mehta", "rohan.mehta99@yahoo.in", "+919811012003", True),
            ("Sanya Malhotra (Walk-in Guest)", None, None, False),
            ("Vikramaditya Rao", "vikram.rao@enterprise.co.in", "+919811012005", True),
            ("Priya Nair (Hotel Walk-in)", None, None, False),
            ("Rahul Deshpande", "rahul.d@techsolutions.com", "+919811012007", True),
            ("Ananya Chattopadhyay", "ananya.chatterjee@designstudio.in", "+919811012008", True),
            ("Karan Johari", "karan.johari@investing.com", "+919811012009", True),
            ("Nisha Aggarwal (Spa Walk-in)", None, None, False),
            ("Siddharth Banerjee", "siddharth.banerjee@gmail.com", "+919811012011", True),
            ("Meenakshi Sundaram", "meenakshi.s@chennaitel.in", "+919811012012", True),
            ("Harshwardhan Kapoor", "harsh.kapoor@bollywood.co.in", "+919811012013", True),
            ("Divya Suryavanshi", "divya.suryavanshi@fashion.in", "+919811012014", True),
            ("Arjun Rampal (Executive Walk-in)", None, None, False),
            ("Radrika Radhakrishnan", "radhika.r@lawfirm.com", "+919811012016", True),
            ("Devika Sethi", "devika.sethi88@gmail.com", "+919811012017", True),
            ("Pranav Mukerjee", "pranav.m@mediahouse.co.in", "+919811012018", True),
            ("Tanvi Shah", "tanvi.shah.designs@outlook.com", "+919811012019", True),
            ("Kunal Bhardwaj (Express Walk-in)", None, None, False),
            ("Shruti Haasan", "shruti.h@musiccollective.in", "+919811012021", True),
            ("Manish Malhotra", "manish.malhotra@haute.in", "+919811012022", True),
            ("Farhan Akhtar", "farhan.akhtar@cinema.co.in", "+919811012023", True),
            ("Kareena Kapoor", "kareena.k@luxurybrand.com", "+919811012024", True),
            ("Ranbir Kapoor", "ranbir.kapoor@ventures.in", "+919811012025", True),
            ("Deepika Padukone", "deepika.p@wellness.in", "+919811012026", True),
            ("Ranveer Singh", "ranveer.singh@energy.in", "+919811012027", True),
            ("Alia Bhatt", "alia.bhatt@sustainability.in", "+919811012028", True),
            ("Varun Dhawan", "varun.dhawan@fitness.co.in", "+919811012029", True),
            ("Katrina Kaif", "katrina.kaif@beauty.in", "+919811012030", True),
            ("Vicky Kaushal", "vicky.kaushal@production.co.in", "+919811012031", True),
            ("Anushka Sharma", "anushka.s@apparel.in", "+919811012032", True),
            ("Virat Kohli", "virat.k@one8.co.in", "+919811012033", True),
            ("Priyanka Chopra", "priyanka.c@globalproduction.com", "+919811012034", True),
            ("Nick Jonas", "nick.j@musicstudio.com", "+919811012035", True),
            ("Shahid Kapoor", "shahid.kapoor@lifestyle.in", "+919811012036", True),
            ("Mira Rajput", "mira.rajput@organic.co.in", "+919811012037", True),
            ("Saif Ali Khan", "saif.ali@pataudi.co.in", "+919811012038", True),
            ("Shibani Dandekar", "shibani.d@television.co.in", "+919811012039", True),
            ("Farah Khan", "farah.khan@choreography.in", "+919811012040", True),
            ("Raja Kumar", "raja.kumar.dev@gmail.com", "+919811012041", True),
            ("Swati Mishra", "swati.mishra.hr@tcs.com", "+919811012042", True),
            ("Rajiv Palla", "rajiv.palla@nearbyme.in", "+919811012043", True),
            ("Anita Lokhande", "anita.lokhande@pune.co.in", "+919811012044", True),
            ("Vaishali Takkar", "vaishali.takkar@mumbai.co.in", "+919811012045", True),
            ("Sudeep Kichha", "sudeep.k@cinema.in", "+919811012046", True),
            ("Rashmika Mandanna", "rashmika.m@filmstudio.co.in", "+919811012047", True),
            ("Yash Gowda", "yash.g@productionhouse.in", "+919811012048", True),
            ("Samantha Ruth", "samantha.r@wellnesscollective.in", "+919811012049", True),
            ("Naga Chaitanya", "chaitanya@motorsport.co.in", "+919811012050", True)
        ]
        professional_roster = [
            "PROF-BLR-001 (Syed Rahman - Senior Styling Director)",
            "PROF-BLR-002 (Anita Desai - Master Aesthetician)",
            "PROF-MUM-003 (Tarun Gill - Celebrity Colorist)",
            "PROF-MUM-004 (Elena Varghese - Advanced Skin Therapist)",
            "PROF-HYD-005 (Kavita Menon - Lead Hair Sculptor)",
            "PROF-DEL-006 (Rahul Roy - Thai Panchakarma Specialist)",
            "PROF-DEL-007 (Deepak Chhabra - Master Barber)",
            "PROF-BLR-008 (Pooja Nair - Senior Reflexology Consultant)"
        ]
        customers_created = 0
        for name_val, email_val, phone_val, is_global_val in real_customers:
            cust, cust_created = GlobalCustomer.objects.get_or_create(
                name=name_val,
                phone_e164=phone_val,
                defaults={
                    "email": email_val,
                    "status": CustomerStatus.DELETION_REQUESTED if name_val == "Aarav Shinde" else CustomerStatus.ACTIVE,
                    "is_global": is_global_val
                }
            )
            if cust_created:
                customers_created += 1
                linked_stores = random.sample(store_groups, random.randint(1, 3))
                for l_store in linked_stores:
                    visits = random.randint(1, 15)
                    spend = visits * random.choice([149900, 249900, 499900, 699900, 1299900])
                    if not CustomerStoreLink.objects.filter(customer=cust, store_group=l_store).exists():
                        CustomerStoreLink.objects.create(
                            customer=cust,
                            store_group=l_store,
                            first_visit_at=timezone.now() - timedelta(days=random.randint(60, 180)),
                            last_visit_at=timezone.now() - timedelta(days=random.randint(1, 30)),
                            visit_count=visits,
                            lifetime_spend_paise=spend,
                            preferred_professional_id=random.choice(professional_roster),
                            notes="Regular premium member. Prefers organic hair care products and silent massages." if visits > 3 else "Initial walk-in Consultation.",
                            lifecycle_stage=CustomerLifecycleStage.REPEAT if visits > 3 else CustomerLifecycleStage.ACTIVE
                        )
        self.stdout.write(self.style.SUCCESS(f"✔ Seeded {customers_created} Authentic Customer Profiles (including Walk-In non-global exceptions & DPDP queues) with Real Professional Roster Links."))
        demo_business, _ = Business.objects.get_or_create(
            email="ops.director@nearbyme.in",
            defaults={
                "name": "NearbyMe Enterprise Operations",
                "phone": "+918001234567",
                "address": "Metropolitan Operations Hub",
                "city": "Bengaluru",
                "state": "Karnataka",
                "country": "India"
            }
        )
        demo_brand, _ = Brand.objects.get_or_create(
            business=demo_business,
            name="NearbyMe Signature Sanctuary"
        )
        demo_store, _ = Store.objects.get_or_create(
            brand=demo_brand,
            business=demo_business,
            name="NearbyMe Partner Studio (POS Branch)",
            defaults={"contact_number": "+919800000000", "email": "studio.pos@nearbyme.in", "address": "Indiranagar 100ft Road"}
        )
        sample_users_data = [
            ("Rahul Sharma", "rahul.sharma.client@nearbyme.in", "+919900112233"),
            ("Priya Nair", "priya.nair.client@nearbyme.in", "+919900112234"),
            ("Neha Kapoor", "neha.kapoor.client@nearbyme.in", "+919900112235"),
            ("Vikram Aditya", "vikram.aditya.client@nearbyme.in", "+919900112236"),
            ("Ananya Pandey", "ananya.p.client@nearbyme.in", "+919900112237"),
        ]
        demo_customers = []
        for c_name, c_email, c_phone in sample_users_data:
            parts = c_name.split()
            first_name = parts[0]
            last_name = parts[1] if len(parts) > 1 else ""
            user_obj, _ = User.objects.get_or_create(
                email=c_email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": c_phone,
                    "role": Role.CUSTOMER,
                    "is_active": True
                }
            )
            demo_customers.append(user_obj)
        outlets_list = list(Outlet.all_objects.all() if hasattr(Outlet, 'all_objects') else Outlet.objects.all())
        appointments_created = 0
        invoices_created = 0
        for out_obj in outlets_list:
            num_records = random.randint(3, 5)
            for i in range(num_records):
                appt_time = timezone.now() - timedelta(days=random.randint(1, 15), hours=random.randint(1, 8))
                appt_status = random.choice([AppointmentStatus.COMPLETED, AppointmentStatus.BOOKED, AppointmentStatus.IN_PROGRESS])
                c_user = random.choice(demo_customers)
                appt = Appointment.objects.create(
                    store=demo_store,
                    outlet=out_obj,
                    customer=c_user,
                    start_time=appt_time,
                    end_time=appt_time + timedelta(hours=1),
                    status=appt_status,
                    notes="Premium organic wellness session."
                )
                appointments_created += 1
                inv_num = f"INV-{out_obj.id.hex[:4].upper()}-{uuid.uuid4().hex[:6].upper()}"
                while Invoice.objects.filter(invoice_number=inv_num).exists():
                    inv_num = f"INV-{out_obj.id.hex[:4].upper()}-{uuid.uuid4().hex[:6].upper()}"
                Invoice.objects.create(
                    invoice_number=inv_num,
                    store=demo_store,
                    outlet=out_obj,
                    appointment=appt,
                    customer=c_user,
                    grand_total=random.choice([1499.00, 2499.00, 3999.00, 4999.00, 7499.00]),
                    status=InvoiceStatus.PAID if appt_status == AppointmentStatus.COMPLETED else InvoiceStatus.UNPAID
                )
                invoices_created += 1
        self.stdout.write(self.style.SUCCESS(f"✔ Seeded {appointments_created} Demo Appointments and {invoices_created} POS Customer Invoices linked directly to Outlets for Read-Only Admin Previews."))
        AuditLog.objects.create(
            actor_id="Enterprise Seed Executor",
            actor_type="system",
            action="seed_database",
            entity_type="database",
            entity_id="all_phase_1_tables",
            before={},
            after={"status": "complete", "services": 53, "store_groups": len(store_groups), "customers": len(real_customers)}
        )
        self.stdout.write(self.style.SUCCESS("\n🎉 MASTER ADMIN PHASE 1 REAL-WORLD DATA SEED COMPLETED SUCCESSFULLY! ZERO ERRORS."))
