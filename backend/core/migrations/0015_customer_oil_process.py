from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_appuserprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='oil_process_status',
            field=models.CharField(choices=[('Beklemede', 'Beklemede'), ('Sıkımda', 'Sıkımda'), ('İşlem Tamam', 'İşlem Tamam')], default='Beklemede', max_length=20),
        ),
        migrations.AddField(
            model_name='customer',
            name='oil_output_liters',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]