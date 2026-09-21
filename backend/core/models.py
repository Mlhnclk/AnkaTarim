from decimal import Decimal
from datetime import datetime

from django.contrib.auth.models import User
from django.db import models


# Üretim, kullanıcı ve depo temel modelleri
class OliveBatch(models.Model):
    batch_no = models.CharField(max_length=20, unique=True)
    producer = models.CharField(max_length=100)
    olive_type = models.CharField(max_length=50)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, default='Kabul Edildi')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.batch_no} - {self.producer}"


class AppUserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='app_profile')
    can_create_records = models.BooleanField(default=False)
    can_edit_records = models.BooleanField(default=False)
    can_delete_records = models.BooleanField(default=False)
    can_manage_purchases = models.BooleanField(default=False)
    can_manage_sales = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username


class StorageTank(models.Model):
    tank_code = models.CharField(max_length=10, unique=True)
    capacity_liters = models.IntegerField()
    current_liters = models.IntegerField(default=0)
    oil_type = models.CharField(max_length=100)

    @property
    def fill_rate(self):
        if self.capacity_liters == 0:
            return 0
        return int((self.current_liters / self.capacity_liters) * 100)

    def __str__(self):
        return f"{self.tank_code} ({self.oil_type})"


# Üretici ve zeytinyağı işlem süreci
class Customer(models.Model):
    OIL_PROCESS_STATUS_CHOICES = [
        ('Beklemede', 'Beklemede'),
        ('Sıkımda', 'Sıkımda'),
        ('İşlem Tamam', 'İşlem Tamam'),
    ]

    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    oil_process_status = models.CharField(max_length=20, choices=OIL_PROCESS_STATUS_CHOICES, default='Beklemede')
    oil_output_liters = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name

    def oil_kg_per_liter(self, total_oil_kg):
        if not self.oil_output_liters or self.oil_output_liters <= 0:
            return None
        return Decimal(str(total_oil_kg or 0)) / self.oil_output_liters


# Satış müşterisi, araç ve şoför kayıtları
class MerchantParty(models.Model):
    PARTY_TYPE_CHOICES = [('individual', 'Bireysel'), ('corporate', 'Kurumsal')]

    party_type = models.CharField(max_length=20, choices=PARTY_TYPE_CHOICES)
    name = models.CharField(max_length=160)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['party_type', 'name']

    def __str__(self):
        return self.name


class Driver(models.Model):
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(max_length=20, default='Aktif')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name


class Vehicle(models.Model):
    plate = models.CharField(max_length=20, unique=True)
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['plate']

    def __str__(self):
        return self.plate


# Satış başlığı; zeytin, yağ, araç ve ödeme ilişkilerini taşır
class SalesRecord(models.Model):
    party = models.ForeignKey(MerchantParty, on_delete=models.PROTECT, related_name='sales')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    sale_date = models.DateField()
    sale_no = models.PositiveIntegerField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    whatsapp_status = models.CharField(max_length=20, default='Bekliyor')
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)
    whatsapp_message_content = models.TextField(blank=True, default='')
    whatsapp_error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_paid(self):
        payment_total = self.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        return payment_total + self.paid_amount

    @property
    def remaining_amount(self):
        return max(self.total_amount - self.total_paid, Decimal('0.00'))

    @property
    def whatsapp_message(self):
        party_label = 'Sayın' if self.party.party_type == 'individual' else 'Sayın firma yetkilisi'
        lines = [
            f'{party_label} {self.party.name},',
            '',
            f'{self.sale_date.day:02d}.{self.sale_date.month:02d}.{self.sale_date.year} tarihli satış kaydınız:',
            f'Satış No: {self.sale_no}',
        ]
        if self.party.party_type == 'corporate' and (self.vehicle or self.driver):
            if self.vehicle:
                lines.append(f'Araç plakası: {self.vehicle.plate}')
            if self.driver:
                lines.append(f'Şoför: {self.driver.full_name}')
        for item in self.items.all():
            lines.append(f'{item.olive_type} / {item.size}: {item.quantity_kg:.2f} KG x {item.unit_price:.2f} TL = {item.line_total:.2f} TL')
        for item in self.oil_items.all():
            lines.append(f'Zeytinyağı: {item.liters:.2f} litre x {item.unit_price:.2f} TL = {item.line_total:.2f} TL')
        lines.extend([
            f'Toplam Tutar: {self.total_amount:.2f} TL',
            f'Ödenen Tutar: {self.total_paid:.2f} TL',
            f'Kalan Tutar: {self.remaining_amount:.2f} TL',
        ])
        return '\n'.join(lines)

    class Meta:
        ordering = ['-sale_date', '-id']


# Satışa ait ek ödeme hareketleri
class SalesPayment(models.Model):
    sale = models.ForeignKey(SalesRecord, on_delete=models.CASCADE, related_name='payments')
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    note = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['payment_date', 'id']


# Satış ekranında kullanılan cins ve numara fiyatları
class SalesPrice(models.Model):
    olive_type = models.CharField(max_length=50, unique=True)
    size_11 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_12 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_13 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_14 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_15 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_16 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_17 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))


class SalesItem(models.Model):
    sale = models.ForeignKey(SalesRecord, on_delete=models.CASCADE, related_name='items')
    olive_type = models.CharField(max_length=50)
    size = models.PositiveSmallIntegerField()
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    oil_release = models.BooleanField(default=False)

    @property
    def line_total(self):
        return self.quantity_kg * self.unit_price


class SalesOilPrice(models.Model):
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))


class SalesOilItem(models.Model):
    sale = models.ForeignKey(SalesRecord, on_delete=models.CASCADE, related_name='oil_items')
    liters = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    @property
    def line_total(self):
        return self.liters * self.unit_price


class Shipment(models.Model):
    STATUS_CHOICES = [
        ('Yuklemede', 'Yüklemede'),
        ('Yolda', 'Yolda'),
        ('AdreseUlasti', 'Teslimat adresine ulaştı'),
        ('Vardi', 'Teslimat adresine ulaştı'),
    ]

    sale = models.OneToOneField(SalesRecord, on_delete=models.CASCADE, related_name='shipment')
    delivery_address = models.CharField(max_length=255)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Yuklemede')
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'Gönderim #{self.sale.sale_no}'


class ShipmentItem(models.Model):
    PRODUCT_TYPE_CHOICES = [('olive', 'Zeytin'), ('oil', 'Zeytinyağı')]

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='items')
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES)
    olive_type = models.CharField(max_length=50, blank=True, default='')
    size = models.PositiveSmallIntegerField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_loaded = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']


# Manuel zeytin ve zeytinyağı stok girişleri
class InventoryEntry(models.Model):
    PRODUCT_TYPE_CHOICES = [('olive', 'Zeytin'), ('oil', 'Zeytinyağı')]

    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES)
    olive_type = models.CharField(max_length=50, blank=True, default='')
    size = models.PositiveSmallIntegerField(null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    note = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']


class ResponsiblePerson(models.Model):
    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Pasif', 'Pasif'),
    ]

    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Aktif')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name

    @property
    def total_commission(self):
        return sum(
            (record.commission_amount for station in self.stations.all() for record in station.records.all()),
            Decimal('0.00'),
        )

    @property
    def total_commission_paid(self):
        return self.commission_payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def remaining_commission(self):
        return max(self.total_commission - self.total_commission_paid, Decimal('0.00'))


class ResponsiblePersonPayment(models.Model):
    person = models.ForeignKey(ResponsiblePerson, on_delete=models.CASCADE, related_name='commission_payments')
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    note = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']

    def __str__(self):
        return f"{self.person.full_name} - {self.amount} TL"


class SieveStation(models.Model):
    STATUS_CHOICES = [
        ('Aktif', 'Aktif'),
        ('Pasif', 'Pasif'),
    ]

    COMMISSION_BASIS_CHOICES = [
        ('kg', 'TL/KG'),
        ('amount', 'Toplam Tutar'),
    ]

    COMMISSION_SCOPE_CHOICES = [
        ('total_weight', 'Toplam KG'),
        ('net_weight', 'Net KG'),
        ('oil_weight', 'Yağlık KG'),
        ('sales_amount', 'Satış Tutarı'),
    ]

    name = models.CharField(max_length=100)
    responsible = models.CharField(max_length=100, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    commission_per_kg = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Aktif')
    commission_basis = models.CharField(max_length=20, choices=COMMISSION_BASIS_CHOICES, default='kg')
    commission_scope = models.CharField(max_length=30, choices=COMMISSION_SCOPE_CHOICES, default='total_weight')
    work_dates = models.JSONField(default=list, blank=True)
    responsible_persons = models.ManyToManyField(ResponsiblePerson, related_name='stations', blank=True)

    def __str__(self):
        return self.name


class OlivePrice(models.Model):
    olive_type = models.CharField(max_length=50, unique=True)
    size_11 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_12 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_13 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_14 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_15 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_16 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_17 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    @property
    def price_per_kg(self):
        return self.size_13 if self.size_13 else Decimal('0.00')

    def price_for_size(self, size):
        size_key = f'size_{size}'
        return getattr(self, size_key, Decimal('0.00')) or Decimal('0.00')

    def __str__(self):
        return f"{self.olive_type} - {self.size_13} TL/kg"


class CustomerPayment(models.Model):
    record = models.ForeignKey('CustomerSortingRecord', on_delete=models.CASCADE, related_name='payments')
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    note = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['payment_date', 'id']

    def __str__(self):
        return f"{self.record.customer} - {self.payment_date} - {self.amount} TL"


class CustomerSortingRecord(models.Model):
    WHATSAPP_STATUS_CHOICES = [
        ('Bekliyor', 'Bekliyor'),
        ('Gönderildi', 'Gönderildi'),
        ('Gönderilemedi', 'Gönderilemedi'),
    ]

    date = models.DateField()
    sieve_station = models.ForeignKey(SieveStation, on_delete=models.CASCADE, related_name='records')
    responsible_person = models.ForeignKey(ResponsiblePerson, on_delete=models.SET_NULL, null=True, blank=True, related_name='sorting_records')
    customer = models.CharField(max_length=100)
    sequence_no = models.IntegerField()
    pressing_sequence_no = models.IntegerField(null=True, blank=True)
    purchase_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    payable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    whatsapp_status = models.CharField(max_length=20, choices=WHATSAPP_STATUS_CHOICES, default='Bekliyor')
    whatsapp_sent_at = models.DateTimeField(null=True, blank=True)
    whatsapp_message_content = models.TextField(blank=True, default='')
    whatsapp_error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def next_sequence_for_station(cls, sieve_station, date_value):
        queryset = cls.objects.filter(sieve_station=sieve_station, date=date_value)
        if not queryset.exists():
            return 1
        return queryset.aggregate(models.Max('sequence_no'))['sequence_no__max'] + 1

    @property
    def total_weight(self):
        total = Decimal('0.00')
        for item in self.items.all():
            for size in range(11, 18):
                quantity = getattr(item, f'size_{size}', Decimal('0.00')) or Decimal('0.00')
                total += Decimal(str(quantity))
        return total

    @property
    def total_oil_amount(self):
        return sum((item.oil_amount for item in self.items.all()), Decimal('0.00'))

    @property
    def total_amount(self):
        return sum((item.line_total for item in self.items.all()), Decimal('0.00'))

    @property
    def effective_purchase_amount(self):
        return self.purchase_amount if self.purchase_amount > 0 else self.total_amount

    @property
    def effective_payable_amount(self):
        return self.payable_amount if self.payable_amount > 0 else self.effective_purchase_amount

    @property
    def total_paid(self):
        payment_total = self.payments.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        return payment_total + self.paid_amount

    @property
    def previous_balance(self):
        prior_records = CustomerSortingRecord.objects.filter(customer=self.customer).filter(
            models.Q(date__lt=self.date) | (models.Q(date=self.date) & models.Q(id__lt=self.id))
        )
        return sum((record.remaining_amount for record in prior_records), Decimal('0.00'))

    @property
    def new_balance(self):
        return self.previous_balance + self.effective_payable_amount - self.total_paid

    @property
    def commission_amount(self):
        station = self.sieve_station
        if station is None:
            return Decimal('0.00')

        scope = station.commission_scope or 'total_weight'
        if scope == 'total_weight':
            base_weight = self.total_weight
        elif scope == 'net_weight':
            base_weight = max(self.total_weight - self.total_oil_amount, Decimal('0.00'))
        elif scope == 'oil_weight':
            base_weight = self.total_oil_amount
        elif scope == 'sales_amount':
            return self.total_amount * station.commission_per_kg
        else:
            base_weight = self.total_weight

        if station.commission_basis == 'amount':
            return self.total_amount * station.commission_per_kg

        return base_weight * station.commission_per_kg

    @property
    def remaining_amount(self):
        return max(self.effective_payable_amount - self.total_paid, Decimal('0.00'))

    @property
    def whatsapp_message(self):
        month_names = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
        ]

        def format_number(value):
            formatted = f'{Decimal(str(value or 0)):,.2f}'
            return formatted.rstrip('0').rstrip('.').replace(',', 'X').replace('.', ',').replace('X', '.')

        message_date = self.date
        if isinstance(message_date, str):
            message_date = datetime.strptime(message_date, '%Y-%m-%d').date()

        lines = [
            f"Sayın {self.customer},",
            '',
            f"{message_date.day} {month_names[message_date.month - 1]} {message_date.year} tarihli ürün teslim kaydınız:",
            '',
        ]
        for item in self.items.all():
            lines.append(f"{item.olive_type}:")
            for size in range(11, 18):
                value = getattr(item, f'size_{size}') or Decimal('0')
                if value > 0:
                    unit_price = item.price_for_size(size)
                    line_total = value * unit_price
                    lines.append(
                        f"{size}: {format_number(value)} KG × {format_number(unit_price)} TL = {format_number(line_total)} TL"
                    )
            lines.append('')
        lines.append(f"Toplam Yağlık: {format_number(self.total_oil_amount)} KG")
        customer = Customer.objects.filter(full_name=self.customer).first()
        if customer:
            lines.append(f"Yağlık işlem durumu: {customer.get_oil_process_status_display()}")
            if customer.oil_output_liters:
                lines.append(f"Zeytinyağı çıktısı: {format_number(customer.oil_output_liters)} litre")
                kg_per_liter = customer.oil_kg_per_liter(self.total_oil_amount)
                if kg_per_liter is not None:
                    lines.append(f"1 litre için: {format_number(kg_per_liter)} KG")
        lines.append('')
        lines.append(f"Ödenecek Tutar: {format_number(self.effective_payable_amount)} TL")
        lines.append(f"Ödenen Tutar: {format_number(self.total_paid)} TL")
        lines.append(f"Kalan Tutar: {format_number(self.remaining_amount)} TL")
        return '\n'.join(lines)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.customer} - {self.sequence_no}"


class CustomerSortingItem(models.Model):
    record = models.ForeignKey(CustomerSortingRecord, on_delete=models.CASCADE, related_name='items')
    olive_type = models.CharField(max_length=50)
    size_11 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_12 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_13 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_14 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_15 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_16 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    size_17 = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    price_11 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_12 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_13 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_14 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_15 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_16 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_17 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    oil_release = models.CharField(
        max_length=50,
        choices=[('11-12', '11-12'), ('13-17', '13-17'), ('all', 'Tümü'), ('none', 'Yok')],
        default='none',
    )

    @property
    def unit_price(self):
        return self.price_for_size(13)

    @staticmethod
    def normalize_decimal(value):
        if value in (None, '', ' '):
            return Decimal('0.00')
        return Decimal(str(value))

    def save(self, *args, **kwargs):
        for size in range(11, 18):
            field_name = f'size_{size}'
            current_value = getattr(self, field_name)
            if current_value in (None, '', ' '):
                setattr(self, field_name, Decimal('0.00'))
            else:
                setattr(self, field_name, self.normalize_decimal(current_value))

        for size in range(11, 18):
            field_name = f'price_{size}'
            current_value = getattr(self, field_name, None)
            if current_value in (None, '', ' '):
                setattr(self, field_name, None)
            elif current_value is not None:
                setattr(self, field_name, self.normalize_decimal(current_value))

        super().save(*args, **kwargs)

    def price_for_size(self, size):
        snapshot = getattr(self, f'price_{size}', None)
        if snapshot is not None:
            return snapshot

        price = OlivePrice.objects.filter(olive_type=self.olive_type).first()
        if not price:
            return Decimal('0.00')
        return price.price_for_size(size)

    def oil_release_sizes(self):
        release_to_sizes = {
            '11-12': [11, 12],
            '13-17': [13, 14, 15, 16, 17],
            'all': [11, 12, 13, 14, 15, 16, 17],
            'none': [],
        }
        if self.oil_release.startswith('custom:'):
            return [
                int(value)
                for value in self.oil_release[7:].split(',')
                if value.isdigit() and 11 <= int(value) <= 17
            ]
        return release_to_sizes.get(self.oil_release, [])

    @property
    def oil_amount(self):
        sizes = self.oil_release_sizes()
        if not sizes:
            return Decimal('0.00')
        total = Decimal('0.00')
        for size in sizes:
            total += getattr(self, f'size_{size}') or Decimal('0.00')
        return total

    @property
    def line_total(self):
        total = Decimal('0.00')
        oil_release_sizes = self.oil_release_sizes()
        for size in range(11, 18):
            if size in oil_release_sizes:
                continue
            unit_price = self.price_for_size(size)
            quantity = getattr(self, f'size_{size}')
            if quantity is None or quantity == '':
                quantity = Decimal('0.00')
            total += Decimal(str(quantity)) * unit_price
        return total

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.olive_type} - {self.record.customer}"