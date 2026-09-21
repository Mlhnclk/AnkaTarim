from django.db import migrations, models


def migrate_record_permissions(apps, schema_editor):
    AppUserProfile = apps.get_model('core', 'AppUserProfile')
    for profile in AppUserProfile.objects.all():
        profile.can_manage_purchases = (
            profile.can_create_records
            or profile.can_edit_records
            or profile.can_delete_records
        )
        profile.save(update_fields=['can_manage_purchases'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0027_shipmentitem_is_loaded_alter_shipment_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='appuserprofile',
            name='can_manage_purchases',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appuserprofile',
            name='can_manage_sales',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='appuserprofile',
            name='can_create_records',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(migrate_record_permissions, migrations.RunPython.noop),
    ]