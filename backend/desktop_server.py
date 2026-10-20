import os


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    import django
    from django.core.management import call_command
    from django.core.wsgi import get_wsgi_application
    from waitress import serve

    django.setup()
    call_command('migrate', interactive=False, verbosity=0)
    application = get_wsgi_application()
    serve(
        application,
        host='127.0.0.1',
        port=int(os.environ.get('ANKA_PORT', '8765')),
        threads=8,
    )


if __name__ == '__main__':
    main()
