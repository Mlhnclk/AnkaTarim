from django.db import migrations, models
from decimal import Decimal


class Migration(migrations.Migration):
    dependencies = [('core', '0016_normalize_phone_numbers')]
    operations = [
        migrations.AddField(model_name='customersortingrecord', name='purchase_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='customersortingrecord', name='payable_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
    ]