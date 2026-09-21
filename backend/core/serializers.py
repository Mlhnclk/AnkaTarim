from decimal import Decimal

from django.contrib.auth.models import User
from django.db import models
from rest_framework import serializers
from .models import (
    Customer,
    CustomerPayment,
    CustomerSortingItem,
    CustomerSortingRecord,
    OliveBatch,
    OlivePrice,
    ResponsiblePerson,
    ResponsiblePersonPayment,
    SieveStation,
    StorageTank,
    AppUserProfile,
    MerchantParty,
    Driver,
    Vehicle,
    SalesPayment,
    SalesRecord,
    SalesItem,
    SalesPrice,
    SalesOilItem,
    SalesOilPrice,
    InventoryEntry,
    Shipment,
    ShipmentItem,
)


# Üretici ve satış müşterisi API dönüşümleri
class CustomerSerializer(serializers.ModelSerializer):
    oil_kg_per_liter = serializers.SerializerMethodField()

    def get_oil_kg_per_liter(self, obj):
        total_oil = sum(
            (record.total_oil_amount for record in CustomerSortingRecord.objects.filter(customer=obj.full_name)),
            Decimal('0.00'),
        )
        value = obj.oil_kg_per_liter(total_oil)
        return value

    class Meta:
        model = Customer
        fields = ['id', 'full_name', 'phone', 'address', 'notes', 'oil_process_status', 'oil_output_liters', 'oil_kg_per_liter', 'created_at']


class MerchantPartySerializer(serializers.ModelSerializer):
    class Meta:
        model = MerchantParty
        fields = ['id', 'party_type', 'name', 'phone', 'address', 'created_at']

    def validate(self, attrs):
        if attrs.get('party_type') == 'corporate' and not attrs.get('address', '').strip():
            raise serializers.ValidationError({'address': 'Kurumsal kayıt için adres gereklidir.'})
        name = attrs.get('name', '').strip()
        party_type = attrs.get('party_type')
        duplicate_query = MerchantParty.objects.filter(
            party_type=party_type,
            name__iexact=name,
        )
        if self.instance:
            duplicate_query = duplicate_query.exclude(pk=self.instance.pk)
        if name and duplicate_query.exists():
            raise serializers.ValidationError({'name': 'Bu tüccar aynı türde zaten kayıtlı.'})
        return attrs


# Araç atamasında kullanılan şoför/personel verisi
class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ['id', 'full_name', 'phone', 'status', 'created_at']


class VehicleSerializer(serializers.ModelSerializer):
    driver_detail = DriverSerializer(source='driver', read_only=True)

    class Meta:
        model = Vehicle
        fields = ['id', 'plate', 'driver', 'driver_detail', 'created_at']


# Satış ödeme hareketlerinin API formatı
class SalesPaymentSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        amount = attrs.get('amount')
        sale = attrs.get('sale')
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({'amount': 'Ödeme tutarı sıfırdan büyük olmalıdır.'})
        if sale and amount > sale.remaining_amount:
            raise serializers.ValidationError({'amount': 'Ödeme tutarı kalan bakiyeden fazla olamaz.'})
        return attrs

    class Meta:
        model = SalesPayment
        fields = ['id', 'sale', 'payment_date', 'amount', 'note', 'created_at']


class SalesItemSerializer(serializers.ModelSerializer):
    line_total = serializers.ReadOnlyField()

    class Meta:
        model = SalesItem
        fields = ['id', 'olive_type', 'size', 'quantity_kg', 'unit_price', 'oil_release', 'line_total']


class SalesPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesPrice
        fields = '__all__'


class SalesOilItemSerializer(serializers.ModelSerializer):
    line_total = serializers.ReadOnlyField()

    class Meta:
        model = SalesOilItem
        fields = ['id', 'liters', 'unit_price', 'line_total']


class SalesOilPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOilPrice
        fields = '__all__'


# Envanter girişlerinde ürün tipine göre alan doğrulaması
class InventoryEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryEntry
        fields = ['id', 'product_type', 'olive_type', 'size', 'quantity', 'note', 'created_at']

    def validate(self, attrs):
        if attrs.get('product_type') == 'olive' and (not attrs.get('olive_type') or not attrs.get('size')):
            raise serializers.ValidationError('Zeytin envanteri için cins ve numara gereklidir.')
        if attrs.get('product_type') == 'oil':
            attrs['olive_type'] = ''
            attrs['size'] = None
        return attrs


# Satış başlığını, kalemlerini ve araç/şoför bağlantılarını birlikte işler
class SalesRecordSerializer(serializers.ModelSerializer):
    total_paid = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()
    whatsapp_message = serializers.ReadOnlyField()
    sale_no = serializers.IntegerField(required=False)
    party = MerchantPartySerializer(read_only=True)
    party_id = serializers.PrimaryKeyRelatedField(source='party', queryset=MerchantParty.objects.all(), write_only=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(source='vehicle', queryset=Vehicle.objects.all(), write_only=True, required=False, allow_null=True)
    driver_id = serializers.PrimaryKeyRelatedField(source='driver', queryset=Driver.objects.all(), write_only=True, required=False, allow_null=True)
    vehicle = VehicleSerializer(read_only=True)
    driver = DriverSerializer(read_only=True)
    payments = SalesPaymentSerializer(many=True, read_only=True)
    items = SalesItemSerializer(many=True, required=False)
    oil_items = SalesOilItemSerializer(many=True, required=False)

    class Meta:
        model = SalesRecord
        fields = ['id', 'party', 'party_id', 'vehicle', 'vehicle_id', 'driver', 'driver_id', 'sale_date', 'sale_no', 'total_amount', 'paid_amount', 'total_paid', 'remaining_amount', 'whatsapp_message', 'whatsapp_status', 'whatsapp_sent_at', 'whatsapp_message_content', 'whatsapp_error', 'created_at', 'payments', 'items', 'oil_items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        oil_items_data = validated_data.pop('oil_items', [])
        if not validated_data.get('sale_no'):
            validated_data['sale_no'] = (SalesRecord.objects.aggregate(max_no=models.Max('sale_no'))['max_no'] or 0) + 1
        record = SalesRecord.objects.create(**validated_data)
        for item_data in items_data:
            SalesItem.objects.create(sale=record, **item_data)
        for item_data in oil_items_data:
            SalesOilItem.objects.create(sale=record, **item_data)
        record.total_amount = sum((item.line_total for item in record.items.all()), Decimal('0.00')) + sum((item.line_total for item in record.oil_items.all()), Decimal('0.00'))
        record.whatsapp_message_content = record.whatsapp_message
        record.save(update_fields=['total_amount', 'whatsapp_message_content'])
        return record


class ShipmentItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentItem
        fields = ['id', 'product_type', 'olive_type', 'size', 'quantity', 'is_loaded']

    def validate(self, attrs):
        if attrs.get('product_type') == 'olive' and (not attrs.get('olive_type') or not attrs.get('size')):
            raise serializers.ValidationError('Zeytin yükü için cins ve numara gereklidir.')
        if attrs.get('product_type') == 'oil':
            attrs['olive_type'] = ''
            attrs['size'] = None
        if attrs.get('quantity', 0) <= 0:
            raise serializers.ValidationError({'quantity': 'Yük miktarı sıfırdan büyük olmalıdır.'})
        return attrs


class ShipmentSerializer(serializers.ModelSerializer):
    sale = SalesRecordSerializer(read_only=True)
    sale_id = serializers.PrimaryKeyRelatedField(source='sale', queryset=SalesRecord.objects.select_related('party'), write_only=True)
    party = MerchantPartySerializer(source='sale.party', read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(source='vehicle', queryset=Vehicle.objects.all(), write_only=True, required=False, allow_null=True)
    driver = DriverSerializer(read_only=True)
    driver_id = serializers.PrimaryKeyRelatedField(source='driver', queryset=Driver.objects.all(), write_only=True, required=False, allow_null=True)
    items = ShipmentItemSerializer(many=True)

    class Meta:
        model = Shipment
        fields = [
            'id', 'sale', 'sale_id', 'party', 'delivery_address', 'vehicle', 'vehicle_id',
            'driver', 'driver_id', 'status', 'note', 'items', 'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        sale = attrs.get('sale') or getattr(self.instance, 'sale', None)
        if sale and sale.party.party_type != 'corporate':
            raise serializers.ValidationError({'sale_id': 'Gönderim yalnızca kurumsal satışlar için oluşturulabilir.'})
        if not attrs.get('delivery_address', getattr(self.instance, 'delivery_address', '')).strip():
            raise serializers.ValidationError({'delivery_address': 'Gönderim adresi gereklidir.'})
        driver = attrs.get('driver', getattr(self.instance, 'driver', None))
        vehicle = attrs.get('vehicle', getattr(self.instance, 'vehicle', None))
        if vehicle and driver and vehicle.driver_id != driver.id:
            raise serializers.ValidationError({'driver_id': 'Seçilen şoför bu araca atanmamış.'})
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        shipment = Shipment.objects.create(**validated_data)
        ShipmentItem.objects.bulk_create([ShipmentItem(shipment=shipment, **item) for item in items_data])
        return shipment

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)
        if items_data is not None:
            instance.items.all().delete()
            ShipmentItem.objects.bulk_create([ShipmentItem(shipment=instance, **item) for item in items_data])
        return instance


class OliveBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = OliveBatch
        fields = '__all__'


class StorageTankSerializer(serializers.ModelSerializer):
    fill_rate = serializers.ReadOnlyField()

    class Meta:
        model = StorageTank
        fields = ['id', 'tank_code', 'capacity_liters', 'current_liters', 'oil_type', 'fill_rate']


class AppUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    can_manage_purchases = serializers.BooleanField(source='app_profile.can_manage_purchases', required=False)
    can_manage_sales = serializers.BooleanField(source='app_profile.can_manage_sales', required=False)
    can_manage_users = serializers.BooleanField(source='app_profile.can_manage_users', required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'password', 'can_manage_purchases', 'can_manage_sales', 'can_manage_users']

    def validate(self, attrs):
        if attrs.get('is_superuser'):
            raise serializers.ValidationError({'is_superuser': 'Superuser yetkisi bu ekrandan verilemez.'})
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop('app_profile', {})
        password = validated_data.pop('password', None)
        user = User.objects.create_user(password=password, **validated_data)
        AppUserProfile.objects.update_or_create(user=user, defaults=profile_data)
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('app_profile', {})
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        AppUserProfile.objects.update_or_create(user=instance, defaults=profile_data)
        return instance


class ResponsiblePersonSerializer(serializers.ModelSerializer):
    total_commission = serializers.ReadOnlyField()
    total_commission_paid = serializers.ReadOnlyField()
    remaining_commission = serializers.ReadOnlyField()
    commission_payments = serializers.SerializerMethodField()

    def get_commission_payments(self, obj):
        return ResponsiblePersonPaymentSerializer(obj.commission_payments.all(), many=True).data

    class Meta:
        model = ResponsiblePerson
        fields = ['id', 'full_name', 'phone', 'status', 'total_commission', 'total_commission_paid', 'remaining_commission', 'commission_payments', 'created_at']


class ResponsiblePersonPaymentSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        amount = attrs.get('amount')
        person = attrs.get('person') or getattr(self.instance, 'person', None)
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({'amount': 'Ödeme tutarı sıfırdan büyük olmalıdır.'})
        if person and amount is not None:
            existing_amount = self.instance.amount if self.instance else Decimal('0.00')
            available_amount = person.remaining_commission + existing_amount
            if amount > available_amount:
                raise serializers.ValidationError({'amount': 'Ödeme tutarı kalan komisyondan fazla olamaz.'})
        return attrs

    class Meta:
        model = ResponsiblePersonPayment
        fields = ['id', 'person', 'payment_date', 'amount', 'note', 'created_at']


class SieveStationSerializer(serializers.ModelSerializer):
    responsible_persons = ResponsiblePersonSerializer(many=True, read_only=True)
    responsible_person_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ResponsiblePerson.objects.all(),
        source='responsible_persons',
        required=False,
    )

    class Meta:
        model = SieveStation
        fields = [
            'id',
            'name',
            'responsible',
            'phone',
            'commission_per_kg',
            'status',
            'commission_basis',
            'commission_scope',
            'work_dates',
            'responsible_persons',
            'responsible_person_ids',
        ]


class OlivePriceSerializer(serializers.ModelSerializer):
    price_per_kg = serializers.ReadOnlyField()

    class Meta:
        model = OlivePrice
        fields = [
            'id',
            'olive_type',
            'size_11',
            'size_12',
            'size_13',
            'size_14',
            'size_15',
            'size_16',
            'size_17',
            'price_per_kg',
        ]


class CustomerPaymentSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        amount = attrs.get('amount')
        record = attrs.get('record') or getattr(self.instance, 'record', None)
        if amount is not None and amount <= 0:
            raise serializers.ValidationError({'amount': 'Ödeme tutarı sıfırdan büyük olmalıdır.'})
        if record and amount is not None:
            existing_amount = self.instance.amount if self.instance else Decimal('0.00')
            available_amount = record.remaining_amount + existing_amount
            if amount > available_amount:
                raise serializers.ValidationError({'amount': 'Ödeme tutarı kalan bakiyeden fazla olamaz.'})
        return attrs

    class Meta:
        model = CustomerPayment
        fields = ['id', 'record', 'payment_date', 'amount', 'note', 'created_at']


class CustomerSortingItemSerializer(serializers.ModelSerializer):
    oil_release = serializers.CharField()
    unit_price = serializers.ReadOnlyField()
    oil_amount = serializers.ReadOnlyField()
    line_total = serializers.ReadOnlyField()
    record = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CustomerSortingItem
        fields = [
            'id',
            'record',
            'olive_type',
            'size_11',
            'size_12',
            'size_13',
            'size_14',
            'size_15',
            'size_16',
            'size_17',
            'price_11',
            'price_12',
            'price_13',
            'price_14',
            'price_15',
            'price_16',
            'price_17',
            'oil_release',
            'unit_price',
            'oil_amount',
            'line_total',
        ]


class CustomerSortingRecordSerializer(serializers.ModelSerializer):
    total_weight = serializers.ReadOnlyField()
    total_amount = serializers.ReadOnlyField()
    effective_purchase_amount = serializers.ReadOnlyField()
    effective_payable_amount = serializers.ReadOnlyField()
    total_paid = serializers.ReadOnlyField()
    previous_balance = serializers.ReadOnlyField()
    new_balance = serializers.ReadOnlyField()
    remaining_amount = serializers.ReadOnlyField()
    total_oil_amount = serializers.ReadOnlyField()
    commission_amount = serializers.ReadOnlyField()
    whatsapp_message = serializers.ReadOnlyField()
    items = CustomerSortingItemSerializer(many=True, required=False)
    payments = CustomerPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerSortingRecord
        fields = [
            'id',
            'date',
            'sieve_station',
            'responsible_person',
            'customer',
            'sequence_no',
            'pressing_sequence_no',
            'purchase_amount',
            'payable_amount',
            'paid_amount',
            'total_weight',
            'total_amount',
            'effective_purchase_amount',
            'effective_payable_amount',
            'total_paid',
            'previous_balance',
            'new_balance',
            'remaining_amount',
            'total_oil_amount',
            'commission_amount',
            'whatsapp_message',
            'whatsapp_status',
            'whatsapp_sent_at',
            'whatsapp_message_content',
            'whatsapp_error',
            'created_at',
            'items',
            'payments',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        payments_data = validated_data.pop('payments', [])
        sieve_station = validated_data.get('sieve_station')
        date_value = validated_data.get('date')
        if validated_data.get('sequence_no') in (None, 0):
            validated_data['sequence_no'] = CustomerSortingRecord.next_sequence_for_station(sieve_station, date_value)

        record = CustomerSortingRecord.objects.create(**validated_data)

        for item_data in items_data:
            olive_type = item_data.get('olive_type')
            pricing = OlivePrice.objects.filter(olive_type=olive_type).first()

            for size in range(11, 18):
                size_field = f'size_{size}'
                value = item_data.get(size_field)
                if value in (None, '', ' '):
                    item_data[size_field] = Decimal('0.00')
                else:
                    item_data[size_field] = Decimal(str(value))

                price_field = f'price_{size}'
                if price_field in item_data and item_data[price_field] in (None, '', ' '):
                    item_data[price_field] = Decimal('0.00')
                elif price_field in item_data:
                    item_data[price_field] = Decimal(str(item_data[price_field]))
                elif pricing is not None:
                    item_data[price_field] = Decimal(str(pricing.price_for_size(size)))
                else:
                    item_data[price_field] = Decimal('0.00')

            CustomerSortingItem.objects.create(record=record, **item_data)

        if payments_data:
            for payment_data in payments_data:
                CustomerPayment.objects.create(record=record, **payment_data)
            total_paid = sum((Decimal(str(payment['amount'])) for payment in payments_data), Decimal('0.00'))
            record.paid_amount = total_paid
            record.save(update_fields=['paid_amount'])
        elif record.paid_amount:
            CustomerPayment.objects.create(record=record, payment_date=date_value, amount=record.paid_amount)

        record.whatsapp_message_content = record.whatsapp_message
        record.save(update_fields=['whatsapp_message_content'])
        return record

    def validate(self, attrs):
        party = attrs.get('party')
        vehicle = attrs.get('vehicle')
        driver = attrs.get('driver')
        if party and party.party_type == 'corporate' and vehicle and driver and vehicle.driver_id != driver.id:
            raise serializers.ValidationError({'driver_id': 'Seçilen şoför bu araca atanmamış.'})
        return attrs