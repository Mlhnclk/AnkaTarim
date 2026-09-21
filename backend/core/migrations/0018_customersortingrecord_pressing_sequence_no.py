from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('core', '0017_customersortingrecord_purchase_amount_and_more')]
    operations = [migrations.AddField(model_name='customersortingrecord', name='pressing_sequence_no', field=models.IntegerField(blank=True, null=True))]