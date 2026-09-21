from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from core.views import (
    AppUserViewSet,
    CustomerPaymentViewSet,
    CustomerViewSet,
    CustomerSortingItemViewSet,
    CustomerSortingRecordViewSet,
    OliveBatchViewSet,
    OlivePriceViewSet,
    ResponsiblePersonViewSet,
    ResponsiblePersonPaymentViewSet,
    SieveStationViewSet,
    StorageTankViewSet,
    MerchantPartyViewSet,
    DriverViewSet,
    VehicleViewSet,
    SalesRecordViewSet,
    SalesPaymentViewSet,
    SalesPriceViewSet,
    SalesOilItemViewSet,
    SalesOilPriceViewSet,
    InventoryEntryViewSet,
    ShipmentViewSet,
    login_view,
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'users', AppUserViewSet)
router.register(r'customer-payments', CustomerPaymentViewSet)
router.register(r'batches', OliveBatchViewSet)
router.register(r'tanks', StorageTankViewSet)
router.register(r'responsible-persons', ResponsiblePersonViewSet)
router.register(r'responsible-person-payments', ResponsiblePersonPaymentViewSet)
router.register(r'sieve-stations', SieveStationViewSet)
router.register(r'olive-prices', OlivePriceViewSet)
router.register(r'sorting-records', CustomerSortingRecordViewSet)
router.register(r'sorting-items', CustomerSortingItemViewSet)
router.register(r'merchant-parties', MerchantPartyViewSet)
router.register(r'drivers', DriverViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'sales-records', SalesRecordViewSet)
router.register(r'sales-payments', SalesPaymentViewSet)
router.register(r'sales-prices', SalesPriceViewSet)
router.register(r'sales-oil-items', SalesOilItemViewSet)
router.register(r'sales-oil-prices', SalesOilPriceViewSet)
router.register(r'inventory-entries', InventoryEntryViewSet)
router.register(r'shipments', ShipmentViewSet)


def home(request):
    return HttpResponseRedirect('http://127.0.0.1:5173/')

urlpatterns = [
    path('', home, name='home'),
    path('api/login/', login_view, name='login'),
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
