from decimal import Decimal

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

from core.models import AppUserProfile, Customer, CustomerPayment, CustomerSortingItem, CustomerSortingRecord, Driver, MerchantParty, OlivePrice, ResponsiblePerson, ResponsiblePersonPayment, SalesPayment, SalesRecord, Shipment, SieveStation, Vehicle


class UserManagementSecurityTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(username='manager', password='test-pass')
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Token {Token.objects.create(user=self.admin).key}'}
        self.superuser = User.objects.create_superuser(username='protected-root', password='test-pass')

    def test_superuser_cannot_be_updated_or_deleted(self):
        update_response = self.client.patch(
            f'/api/users/{self.superuser.id}/',
            {'first_name': 'Changed'},
            content_type='application/json',
            **self.auth_headers,
        )
        delete_response = self.client.delete(
            f'/api/users/{self.superuser.id}/',
            **self.auth_headers,
        )

        self.assertEqual(update_response.status_code, 403)
        self.assertEqual(delete_response.status_code, 403)
        self.superuser.refresh_from_db()
        self.assertEqual(self.superuser.first_name, '')

    def test_user_endpoint_cannot_create_superuser(self):
        response = self.client.post(
            '/api/users/',
            {'username': 'ordinary-user', 'password': 'test-pass', 'is_superuser': True},
            content_type='application/json',
            **self.auth_headers,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='ordinary-user').exists())

    def test_user_manager_profile_can_access_user_management(self):
        manager = User.objects.create_user(username='profile-manager', password='test-pass')
        AppUserProfile.objects.create(user=manager, can_manage_users=True)
        manager_token = Token.objects.create(user=manager)

        response = self.client.get(
            '/api/users/',
            HTTP_AUTHORIZATION=f'Token {manager_token.key}',
        )

        self.assertEqual(response.status_code, 200)


class OliveBatchCORSRegressionTest(TestCase):
    def test_api_allows_vite_frontend_origin(self):
        user = User.objects.create_user(username='cors-user', password='test-pass')
        AppUserProfile.objects.create(user=user, can_manage_purchases=True)
        token = Token.objects.create(user=user)
        response = self.client.get('/api/batches/', HTTP_ORIGIN='http://127.0.0.1:5173', HTTP_AUTHORIZATION=f'Token {token.key}')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5173')


class ShipmentManagementTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='shipment-user', password='test-pass')
        AppUserProfile.objects.create(user=self.user, can_manage_sales=True)
        token = Token.objects.create(user=self.user)
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Token {token.key}'}
        self.party = MerchantParty.objects.create(
            party_type='corporate', name='Anka Market', phone='905300000000', address='Firma adresi'
        )
        self.driver = Driver.objects.create(full_name='Ali Şoför', phone='905311111111')
        self.vehicle = Vehicle.objects.create(plate='07 ANK 07', driver=self.driver)
        self.sale = SalesRecord.objects.create(
            party=self.party, sale_date='2026-09-19', sale_no=1, total_amount=100,
        )

    def test_sale_payment_reduces_remaining_balance(self):
        response = self.client.post('/api/sales-payments/', {
            'sale': self.sale.id,
            'payment_date': '2026-09-21',
            'amount': '35.00',
        }, content_type='application/json', **self.auth_headers)

        self.assertEqual(response.status_code, 201)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.total_paid, Decimal('35.00'))
        self.assertEqual(self.sale.remaining_amount, Decimal('65.00'))

    def test_sale_payment_cannot_exceed_remaining_balance(self):
        response = self.client.post('/api/sales-payments/', {
            'sale': self.sale.id,
            'payment_date': '2026-09-21',
            'amount': '100.01',
        }, content_type='application/json', **self.auth_headers)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(SalesPayment.objects.filter(sale=self.sale).exists())

    def test_corporate_sale_creates_editable_shipment_with_load(self):
        response = self.client.post('/api/shipments/', {
            'sale_id': self.sale.id,
            'delivery_address': 'Depo adresi 12',
            'vehicle_id': self.vehicle.id,
            'driver_id': self.driver.id,
            'items': [{'product_type': 'olive', 'olive_type': 'Ayvalık', 'size': 13, 'quantity': 250, 'is_loaded': True}],
        }, content_type='application/json', **self.auth_headers)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['party']['name'], 'Anka Market')
        self.assertEqual(response.json()['vehicle']['plate'], '07 ANK 07')
        self.assertEqual(response.json()['items'][0]['quantity'], '250.00')
        self.assertTrue(response.json()['items'][0]['is_loaded'])
        self.assertTrue(Shipment.objects.filter(sale=self.sale).exists())

    def test_shipment_rejects_driver_not_assigned_to_vehicle(self):
        other_driver = Driver.objects.create(full_name='Başka Şoför', phone='905322222222')
        response = self.client.post('/api/shipments/', {
            'sale_id': self.sale.id,
            'delivery_address': 'Depo adresi 12',
            'vehicle_id': self.vehicle.id,
            'driver_id': other_driver.id,
            'items': [{'product_type': 'oil', 'quantity': 20}],
        }, content_type='application/json', **self.auth_headers)

        self.assertEqual(response.status_code, 400)
        self.assertIn('driver_id', response.json())


class PaymentValidationTest(TestCase):
    def setUp(self):
        user = User.objects.create_user(username='payment-user', password='test-pass')
        AppUserProfile.objects.create(user=user, can_manage_purchases=True)
        token = Token.objects.create(user=user)
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Token {token.key}'}
        self.station = SieveStation.objects.create(name='Ödeme Eleği', commission_per_kg=1)
        self.record = CustomerSortingRecord.objects.create(
            date='2026-09-21', sieve_station=self.station, customer='Üretici',
            sequence_no=1, payable_amount=100,
        )
        self.person = ResponsiblePerson.objects.create(full_name='Sorumlu', phone='905300000000')
        self.station.responsible_persons.add(self.person)
        self.item = CustomerSortingItem.objects.create(
            record=self.record, olive_type='Ayvalık', size_13=10, price_13=10,
        )

    def test_customer_payment_rejects_negative_and_over_limit_amounts(self):
        for amount in ('-1.00', '100.01'):
            response = self.client.post('/api/customer-payments/', {
                'record': self.record.id,
                'payment_date': '2026-09-21',
                'amount': amount,
            }, content_type='application/json', **self.auth_headers)
            self.assertEqual(response.status_code, 400)

    def test_responsible_payment_rejects_negative_and_over_limit_amounts(self):
        for amount in ('-1.00', '200.01'):
            response = self.client.post('/api/responsible-person-payments/', {
                'person': self.person.id,
                'payment_date': '2026-09-21',
                'amount': amount,
            }, content_type='application/json', **self.auth_headers)
            self.assertEqual(response.status_code, 400)


class CustomerManagementTest(TestCase):
    def test_editing_user_can_delete_customer(self):
        user = User.objects.create_user(username='customer-editor', password='test-pass')
        AppUserProfile.objects.create(user=user, can_manage_purchases=True)
        token = Token.objects.create(user=user)
        customer = Customer.objects.create(full_name='Silinecek Üretici')
        station = SieveStation.objects.create(name='Silme Test Eleği')
        record = CustomerSortingRecord.objects.create(
            date='2026-10-24', sieve_station=station, customer=customer.full_name, sequence_no=1,
        )

        response = self.client.delete(
            f'/api/customers/{customer.id}/',
            HTTP_AUTHORIZATION=f'Token {token.key}',
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Customer.objects.filter(id=customer.id).exists())
        self.assertFalse(CustomerSortingRecord.objects.filter(id=record.id).exists())

    def test_customer_tracks_profile_and_summary_fields(self):
        customer = Customer.objects.create(
            full_name='Ramazan Tatlı',
            phone='05000000000',
            address='Aksu / Antalya',
            notes='Ödemeyi ay sonu yapar.',
        )

        self.assertEqual(customer.full_name, 'Ramazan Tatlı')
        self.assertEqual(customer.phone, '05000000000')
        self.assertEqual(customer.address, 'Aksu / Antalya')
        self.assertEqual(customer.notes, 'Ödemeyi ay sonu yapar.')

    def test_customer_oil_process_tracks_status_output_and_ratio(self):
        customer = Customer.objects.create(
            full_name='Ramazan Tatlı',
            oil_process_status='İşlem Tamam',
            oil_output_liters=Decimal('10.00'),
        )

        self.assertEqual(customer.oil_process_status, 'İşlem Tamam')
        self.assertEqual(customer.oil_kg_per_liter(45), Decimal('4.5'))


class SieveStationManagementTest(TestCase):
    def test_sieve_station_tracks_status_commission_basis_and_work_dates(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
         
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24', '2026-10-25'],
        )

        self.assertEqual(station.status, 'Aktif')
        self.assertEqual(station.commission_basis, 'kg')
        self.assertEqual(station.work_dates, ['2026-10-24', '2026-10-25'])

    def test_responsible_person_commission_balance_tracks_payments(self):
        person = ResponsiblePerson.objects.create(full_name='Ali Veli', phone='05000000000')
        station = SieveStation.objects.create(
            name='Elek 1',
            commission_per_kg=Decimal('2.00'),
            commission_scope='total_weight',
            commission_basis='kg',
        )
        station.responsible_persons.add(person)
        record = CustomerSortingRecord.objects.create(
            date='2026-10-24', sieve_station=station, customer='Müşteri', sequence_no=1,
        )
        CustomerSortingItem.objects.create(record=record, olive_type='Ayvalık', size_13=Decimal('10'))
        self.assertEqual(person.total_commission, Decimal('20.00'))

        ResponsiblePersonPayment.objects.create(person=person, payment_date='2026-10-25', amount=Decimal('8.00'))
        person.refresh_from_db()
        self.assertEqual(person.total_commission_paid, Decimal('8.00'))
        self.assertEqual(person.remaining_commission, Decimal('12.00'))


class OlivePriceSizePricingTest(TestCase):
    def test_olive_price_tracks_individual_size_prices(self):
        price = OlivePrice.objects.create(
            olive_type='Ayvalık',
            size_11=Decimal('5.00'),
            size_12=Decimal('6.00'),
            size_13=Decimal('15.00'),
            size_14=Decimal('20.00'),
            size_15=Decimal('25.00'),
            size_16=Decimal('30.00'),
            size_17=Decimal('35.00'),
        )

        self.assertEqual(price.price_for_size(11), Decimal('5.00'))
        self.assertEqual(price.price_for_size(13), Decimal('15.00'))
        self.assertEqual(price.price_for_size(17), Decimal('35.00'))

    def test_station_sequence_numbers_are_independent_per_station(self):
        station_a = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )
        station_b = SieveStation.objects.create(
            name='Yapıntı Elek 2',
            responsible='Ali Veli',
            phone='05320000000',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )

        CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station_a,
            customer='Müşteri A',
            sequence_no=138,
        )
        CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station_a,
            customer='Müşteri B',
            sequence_no=139,
        )
        CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station_b,
            customer='Müşteri C',
            sequence_no=138,
        )

        self.assertEqual(CustomerSortingRecord.next_sequence_for_station(station_a, '2026-10-24'), 140)
        self.assertEqual(CustomerSortingRecord.next_sequence_for_station(station_b, '2026-10-24'), 139)

    def test_blank_size_values_are_normalized_to_zero_kg(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )
        OlivePrice.objects.create(
            olive_type='Ayvalık',
            size_11=Decimal('5.00'),
            size_12=Decimal('6.00'),
            size_13=Decimal('15.00'),
            size_14=Decimal('20.00'),
            size_15=Decimal('25.00'),
            size_16=Decimal('30.00'),
            size_17=Decimal('35.00'),
        )

        record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('0.00'),
        )

        item = CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_11=Decimal('20.00'),
            size_12=Decimal('10.00'),
            size_13=Decimal('5.00'),
            size_14=Decimal('5.00'),
            size_15=Decimal('1.00'),
            size_16='',
            size_17='',
            oil_release='13-17',
        )

        self.assertEqual(item.size_16, Decimal('0.00'))
        self.assertEqual(item.size_17, Decimal('0.00'))

    def test_sieve_commission_is_calculated_from_total_processed_kg(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            commission_scope='total_weight',
            work_dates=['2026-10-24'],
        )

        record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('0.00'),
        )

        CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_11=Decimal('10.00'),
            size_12=Decimal('8.00'),
            size_13=Decimal('6.00'),
            size_14=Decimal('4.00'),
            size_15=Decimal('2.00'),
            size_16=Decimal('0.00'),
            size_17=Decimal('0.00'),
            oil_release='11-12',
        )

        self.assertEqual(record.total_weight, Decimal('30.00'))
        self.assertEqual(record.commission_amount, Decimal('60.00'))

    def test_customer_balance_tracks_previous_and_new_balance(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            commission_scope='total_weight',
            work_dates=['2026-10-24'],
        )

        first_record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('0.00'),
        )
        CustomerSortingItem.objects.create(
            record=first_record,
            olive_type='Ayvalık',
            size_13=Decimal('200.00'),
            price_13=Decimal('15.00'),
            oil_release='11-12',
        )

        second_record = CustomerSortingRecord.objects.create(
            date='2026-10-25',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=141,
            paid_amount=Decimal('5500.00'),
        )
        CustomerSortingItem.objects.create(
            record=second_record,
            olive_type='Ayvalık',
            size_13=Decimal('700.00'),
            price_13=Decimal('15.00'),
            oil_release='11-12',
        )

        self.assertEqual(first_record.remaining_amount, Decimal('3000.00'))
        self.assertEqual(second_record.previous_balance, Decimal('3000.00'))
        self.assertEqual(second_record.new_balance, Decimal('8000.00'))

    def test_multiple_payment_movements_are_aggregated(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )

        record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('0.00'),
        )

        CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_13=Decimal('100.00'),
            price_13=Decimal('15.00'),
            oil_release='13-17',
        )

        CustomerPayment.objects.create(record=record, payment_date='2026-10-24', amount=Decimal('3000.00'))
        CustomerPayment.objects.create(record=record, payment_date='2026-10-25', amount=Decimal('2500.00'))
        CustomerPayment.objects.create(record=record, payment_date='2026-10-28', amount=Decimal('1500.00'))

        self.assertEqual(record.total_paid, Decimal('7000.00'))
        self.assertEqual(record.remaining_amount, Decimal('0.00'))

    def test_sale_item_freezes_price_snapshot_when_price_changes(self):
        OlivePrice.objects.create(
            olive_type='Ayvalık',
            size_11=Decimal('5.00'),
            size_12=Decimal('6.00'),
            size_13=Decimal('15.00'),
            size_14=Decimal('20.00'),
            size_15=Decimal('25.00'),
            size_16=Decimal('30.00'),
            size_17=Decimal('35.00'),
        )

        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )

        record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('0.00'),
        )

        item = CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_13=Decimal('10.00'),
            price_13=Decimal('15.00'),
            oil_release='11-12',
        )

        olive_price = OlivePrice.objects.get(olive_type='Ayvalık')
        olive_price.size_13 = Decimal('19.00')
        olive_price.save()

        self.assertEqual(item.line_total, Decimal('150.00'))
        self.assertEqual(item.price_for_size(13), Decimal('15.00'))


class SieveWorkflowPricingTest(TestCase):
    def test_customer_record_calculates_total_and_balance(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )
        OlivePrice.objects.create(
            olive_type='Ayvalık',
            size_11=Decimal('5.00'),
            size_12=Decimal('6.00'),
            size_13=Decimal('15.00'),
            size_14=Decimal('20.00'),
            size_15=Decimal('25.00'),
            size_16=Decimal('30.00'),
            size_17=Decimal('35.00'),
        )
        OlivePrice.objects.create(
            olive_type='Gemlik',
            size_11=Decimal('5.00'),
            size_12=Decimal('6.00'),
            size_13=Decimal('14.00'),
            size_14=Decimal('19.00'),
            size_15=Decimal('24.00'),
            size_16=Decimal('29.00'),
            size_17=Decimal('34.00'),
        )

        record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('1200.00'),
        )

        CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_11=Decimal('20'),
            size_12=Decimal('4'),
            size_13=Decimal('26'),
            size_14=Decimal('30'),
            size_15=Decimal('20'),
            size_16=Decimal('0'),
            size_17=Decimal('0'),
            oil_release='11-12',
        )
        CustomerSortingItem.objects.create(
            record=record,
            olive_type='Gemlik',
            size_11=Decimal('20'),
            size_12=Decimal('4'),
            size_13=Decimal('26'),
            size_14=Decimal('30'),
            size_15=Decimal('20'),
            size_16=Decimal('0'),
            size_17=Decimal('0'),
            oil_release='11-12',
        )

        self.assertEqual(record.total_amount.quantize(Decimal('0.01')), Decimal('2904.00'))
        self.assertEqual(record.remaining_amount.quantize(Decimal('0.01')), Decimal('1704.00'))
        self.assertEqual(record.total_oil_amount, Decimal('48.00'))

    def test_oil_release_amount_is_excluded_from_purchase_total(self):
        station = SieveStation.objects.create(name='Elek 1')
        record = CustomerSortingRecord.objects.create(
            date='2026-10-24', sieve_station=station, customer='Müşteri', sequence_no=1,
        )
        item = CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_13=Decimal('10'),
            size_14=Decimal('5'),
            price_13=Decimal('20'),
            price_14=Decimal('30'),
            oil_release='13-17',
        )

        self.assertEqual(item.line_total, Decimal('0.00'))
        self.assertEqual(record.total_amount, Decimal('0.00'))

    def test_non_oil_sizes_are_included_in_purchase_total(self):
        station = SieveStation.objects.create(name='Elek 1')
        record = CustomerSortingRecord.objects.create(
            date='2026-10-24', sieve_station=station, customer='Müşteri', sequence_no=1,
        )
        item = CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_11=Decimal('10'),
            size_12=Decimal('5'),
            price_11=Decimal('8'),
            price_12=Decimal('10'),
            oil_release='none',
        )

        self.assertEqual(item.line_total, Decimal('130.00'))

    def test_whatsapp_message_contains_item_calculations_and_summary(self):
        station = SieveStation.objects.create(
            name='Yapıntı Elek 1',
            responsible='Muhammet Erikçi',
            phone='05325323232',
            commission_per_kg=Decimal('2.00'),
            status='Aktif',
            commission_basis='kg',
            work_dates=['2026-10-24'],
        )
        record = CustomerSortingRecord.objects.create(
            date='2026-10-24',
            sieve_station=station,
            customer='Ramazan Tatlı',
            sequence_no=140,
            paid_amount=Decimal('550.00'),
        )
        CustomerSortingItem.objects.create(
            record=record,
            olive_type='Ayvalık',
            size_13=Decimal('26'),
            price_13=Decimal('20'),
            oil_release='13-17',
        )

        message = record.whatsapp_message

        self.assertIn('24 Ekim 2026 tarihli ürün teslim kaydınız:', message)
        self.assertIn('13: 26 KG × 20 TL = 520 TL', message)
        self.assertIn('Toplam Yağlık: 26 KG', message)
        self.assertIn('Ödenecek Tutar: 0 TL', message)
        self.assertIn('Ödenen Tutar: 550 TL', message)
        self.assertIn('Kalan Tutar: 0 TL', message)
