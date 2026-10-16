from django.contrib import admin

from .models import AppUserProfile, Company


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
