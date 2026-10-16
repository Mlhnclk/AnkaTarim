from django.contrib import admin
from django.db import models

from .models import (
	AppUserProfile,
	Company,
	Customer,
	CustomerPayment,
	CustomerSortingItem,
	CustomerSortingRecord,
	Driver,
	InventoryEntry,
	MerchantParty,
	OliveBatch,
	OlivePrice,
	ResponsiblePerson,
	ResponsiblePersonPayment,
	SalesItem,
	SalesOilItem,
	SalesOilPrice,
	SalesPayment,
	SalesPrice,
	SalesRecord,
	Shipment,
	ShipmentItem,
	SieveStation,
	StorageTank,
	Vehicle,
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
	list_display = ('name', 'slug', 'is_active', 'created_at')
	list_filter = ('is_active',)
	search_fields = ('name', 'slug')
	prepopulated_fields = {'slug': ('name',)}

	def has_delete_permission(self, request, obj=None):
		return False


@admin.register(AppUserProfile)
class AppUserProfileAdmin(admin.ModelAdmin):
	list_display = ('user', 'company', 'can_manage_users', 'can_manage_purchases', 'can_manage_sales')
	list_filter = ('company', 'can_manage_users', 'can_manage_purchases', 'can_manage_sales')
	search_fields = ('user__username', 'user__first_name', 'user__last_name', 'company__name')
	autocomplete_fields = ('user', 'company')


class CompanyOwnedAdmin(admin.ModelAdmin):
	list_display = ('id', 'record_summary', 'company')
	list_filter = ('company',)
	list_per_page = 50

	@admin.display(description='Kayıt')
	def record_summary(self, obj):
		return str(obj)

	def get_search_fields(self, request):
		return tuple(
			field.name
			for field in self.model._meta.fields
			if isinstance(field, (models.CharField, models.TextField))
		)


@admin.register(Customer)
class CustomerAdmin(CompanyOwnedAdmin):
	list_display = ('full_name', 'phone', 'oil_process_status', 'oil_output_liters', 'company')
	list_filter = ('company', 'oil_process_status')
	search_fields = ('full_name', 'phone', 'address')


@admin.register(MerchantParty)
class MerchantPartyAdmin(CompanyOwnedAdmin):
	list_display = ('name', 'party_type', 'phone', 'company')
	list_filter = ('company', 'party_type')
	search_fields = ('name', 'phone', 'address')


@admin.register(SalesRecord)
class SalesRecordAdmin(CompanyOwnedAdmin):
	list_display = ('sale_no', 'party', 'sale_date', 'total_amount', 'paid_amount', 'company')
	list_filter = ('company', 'sale_date')
	search_fields = ('party__name', 'party__phone')


@admin.register(SieveStation)
class SieveStationAdmin(CompanyOwnedAdmin):
	list_display = ('name', 'responsible', 'phone', 'status', 'commission_per_kg', 'company')
	list_filter = ('company', 'status', 'commission_basis', 'commission_scope')
	search_fields = ('name', 'responsible', 'phone')


@admin.register(CustomerSortingRecord)
class CustomerSortingRecordAdmin(CompanyOwnedAdmin):
	list_display = ('date', 'customer', 'sieve_station', 'sequence_no', 'payable_amount', 'paid_amount', 'company')
	list_filter = ('company', 'date', 'sieve_station', 'whatsapp_status')
	search_fields = ('customer', 'sieve_station__name', 'responsible_person__full_name')


admin.site.register([
	CustomerPayment,
	CustomerSortingItem,
	Driver,
	InventoryEntry,
	OliveBatch,
	OlivePrice,
	ResponsiblePerson,
	ResponsiblePersonPayment,
	SalesItem,
	SalesOilItem,
	SalesOilPrice,
	SalesPayment,
	SalesPrice,
	Shipment,
	ShipmentItem,
	StorageTank,
	Vehicle,
], CompanyOwnedAdmin)
