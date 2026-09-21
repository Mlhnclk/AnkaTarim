from django.db import migrations


def format_turkish_phone(phone):
    digits = ''.join(character for character in str(phone or '') if character.isdigit())
    if not digits:
        return ''
    national_number = digits[2:] if digits.startswith('90') else digits[1:] if digits.startswith('0') else digits
    return f'+90{national_number}'


def normalize_phone_numbers(apps, schema_editor):
    Customer = apps.get_model('core', 'Customer')
    ResponsiblePerson = apps.get_model('core', 'ResponsiblePerson')
    SieveStation = apps.get_model('core', 'SieveStation')

    for model in (Customer, ResponsiblePerson, SieveStation):
        for item in model.objects.exclude(phone=''):
            item.phone = format_turkish_phone(item.phone)
            item.save(update_fields=['phone'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_customer_oil_process'),
    ]

    operations = [
        migrations.RunPython(normalize_phone_numbers, migrations.RunPython.noop),
    ]