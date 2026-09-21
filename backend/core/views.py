from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response

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
)
from .serializers import (
    CustomerPaymentSerializer,
    AppUserSerializer,
    CustomerSerializer,
    CustomerSortingItemSerializer,
    CustomerSortingRecordSerializer,
    OliveBatchSerializer,
    OlivePriceSerializer,
    ResponsiblePersonSerializer,
    ResponsiblePersonPaymentSerializer,
    SieveStationSerializer,
    StorageTankSerializer,
    MerchantPartySerializer,
    DriverSerializer,
    VehicleSerializer,
    SalesPaymentSerializer,
    SalesRecordSerializer,
    SalesItemSerializer,
    SalesPriceSerializer,
    SalesOilItemSerializer,
    SalesOilPriceSerializer,
    InventoryEntrySerializer,
    ShipmentSerializer,
)


# Token üretimi için herkese açık giriş endpointi
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    user = authenticate(username=request.data.get('username', '').strip(), password=request.data.get('password', ''))
    if not user or not user.is_active:
        return Response({'detail': 'Kullanıcı adı veya şifre hatalı.'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': AppUserSerializer(user).data})


class UserManagementPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'app_profile', None)
        return bool(profile and profile.can_manage_users)


class AppUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = AppUserSerializer
    permission_classes = [UserManagementPermission]

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_superuser:
            return Response({'detail': 'Superuser kullanıcısı değiştirilemez.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_superuser:
            return Response({'detail': 'Superuser kullanıcısı silinemez.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class AppPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'app_profile', None)
        if not profile:
            return False
        if profile.can_manage_users:
            return True
        permission_name = f'can_manage_{getattr(view, "permission_area", "")}'
        return bool(getattr(profile, permission_name, False))


# Korumalı tüm CRUD endpointleri için ortak temel sınıf
class ProtectedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [AppPermission]


class CustomerViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = Customer.objects.all().order_by('full_name')
    serializer_class = CustomerSerializer

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()
        CustomerSortingRecord.objects.filter(customer=customer.full_name).delete()
        self.perform_destroy(customer)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OliveBatchViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = OliveBatch.objects.all().order_by('-created_at')
    serializer_class = OliveBatchSerializer


class StorageTankViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = StorageTank.objects.all()
    serializer_class = StorageTankSerializer


class ResponsiblePersonViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = ResponsiblePerson.objects.all().order_by('full_name')
    serializer_class = ResponsiblePersonSerializer


class ResponsiblePersonPaymentViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = ResponsiblePersonPayment.objects.all().order_by('-payment_date', '-id')
    serializer_class = ResponsiblePersonPaymentSerializer


class SieveStationViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = SieveStation.objects.all().order_by('name')
    serializer_class = SieveStationSerializer


class OlivePriceViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = OlivePrice.objects.all().order_by('olive_type')
    serializer_class = OlivePriceSerializer


class CustomerPaymentViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = CustomerPayment.objects.all().order_by('payment_date', 'id')
    serializer_class = CustomerPaymentSerializer


class CustomerSortingRecordViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = CustomerSortingRecord.objects.all().order_by('-date', '-id')
    serializer_class = CustomerSortingRecordSerializer


class CustomerSortingItemViewSet(ProtectedModelViewSet):
    permission_area = 'purchases'
    queryset = CustomerSortingItem.objects.all().order_by('id')
    serializer_class = CustomerSortingItemSerializer


class MerchantPartyViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = MerchantParty.objects.all().order_by('party_type', 'name')
    serializer_class = MerchantPartySerializer


# Şoför/personel CRUD endpointi
class DriverViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = Driver.objects.all().order_by('full_name')
    serializer_class = DriverSerializer


# Plaka ve atanmış şoför CRUD endpointi
class VehicleViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = Vehicle.objects.select_related('driver').all().order_by('plate')
    serializer_class = VehicleSerializer


# Satışları müşteri, araç, şoför ve ödeme ilişkileriyle getirir
class SalesRecordViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = SalesRecord.objects.select_related('party', 'vehicle', 'driver', 'vehicle__driver').prefetch_related('payments').all()
    serializer_class = SalesRecordSerializer


class SalesPaymentViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = SalesPayment.objects.all().order_by('payment_date', 'id')
    serializer_class = SalesPaymentSerializer


class SalesPriceViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = SalesPrice.objects.all().order_by('olive_type')
    serializer_class = SalesPriceSerializer


class SalesOilItemViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = SalesOilItem.objects.all().order_by('id')
    serializer_class = SalesOilItemSerializer


class SalesOilPriceViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = SalesOilPrice.objects.all().order_by('id')
    serializer_class = SalesOilPriceSerializer


class InventoryEntryViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = InventoryEntry.objects.all()
    serializer_class = InventoryEntrySerializer


class ShipmentViewSet(ProtectedModelViewSet):
    permission_area = 'sales'
    queryset = Shipment.objects.select_related(
        'sale', 'sale__party', 'vehicle', 'vehicle__driver', 'driver'
    ).prefetch_related('items').all()
    serializer_class = ShipmentSerializer
