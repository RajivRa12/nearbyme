from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Role, Brand, Store

User = get_user_model()

class AuthAndRBACSystemTests(APITestCase):

    def setUp(self):
        self.customer_user = User.objects.create_user(
            email='customer@example.com',
            password='customerpassword123',
            first_name='John',
            last_name='Doe',
            role=Role.CUSTOMER
        )
        
        self.admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpassword123',
            first_name='Master',
            last_name='Admin',
            role=Role.MASTER_ADMIN
        )

        self.register_url = reverse('auth_register')
        self.login_url = reverse('token_obtain_pair')
        self.brand_url = reverse('brand-list')
        self.store_url = reverse('store-list')
        self.user_url = reverse('platform-user-list')

    def test_customer_registration(self):
        data = {
            "email": "newcustomer@example.com",
            "password": "securepassword123",
            "first_name": "Alice",
            "last_name": "Smith"
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['email'], "newcustomer@example.com")
        self.assertEqual(response.data['user']['role'], Role.CUSTOMER)

        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_and_token_response(self):
        data = {
            "email": "customer@example.com",
            "password": "customerpassword123"
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'customer@example.com')
        self.assertEqual(response.data['user']['role'], Role.CUSTOMER)

    def test_unauthenticated_access_denied(self):
        response = self.client.post(self.brand_url, {"name": "Brand X"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rbac_customer_restricted(self):
        self.client.force_authenticate(user=self.customer_user)
        
        response = self.client.post(self.brand_url, {"name": "Brand X"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_master_admin_flow(self):
        self.client.force_authenticate(user=self.admin_user)

        brand_data = {"name": "Orane Spa Brand"}
        brand_response = self.client.post(self.brand_url, brand_data, format='json')
        self.assertEqual(brand_response.status_code, status.HTTP_201_CREATED)
        brand_id = brand_response.data['id']

        store_data = {
            "name": "Orane Spa - Downtown Branch",
            "address": "123 Main St, Metro City",
            "brand": brand_id
        }
        store_response = self.client.post(self.store_url, store_data, format='json')
        self.assertEqual(store_response.status_code, status.HTTP_201_CREATED)
        store_id = store_response.data['id']

        staff_data = {
            "email": "manager@orane.com",
            "password": "managerpassword123",
            "first_name": "David",
            "last_name": "Miller",
            "role": Role.STORE_ADMIN,
            "store": store_id
        }
        staff_response = self.client.post(self.user_url, staff_data, format='json')
        self.assertEqual(staff_response.status_code, status.HTTP_201_CREATED)
        
        new_user = User.objects.get(email="manager@orane.com")
        self.assertEqual(new_user.role, Role.STORE_ADMIN)
        self.assertEqual(new_user.store_id, store_id)
        self.assertEqual(new_user.brand_id, brand_id)

    def test_master_admin_validation(self):
        self.client.force_authenticate(user=self.admin_user)

        invalid_staff_data = {
            "email": "manager_invalid@orane.com",
            "password": "managerpassword123",
            "first_name": "Invalid",
            "last_name": "Manager",
            "role": Role.STORE_ADMIN
        }
        response = self.client.post(self.user_url, invalid_staff_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('store', response.data)
