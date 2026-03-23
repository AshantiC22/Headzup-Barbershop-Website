from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # Call DRF's default handler first
    response = exception_handler(exc, context)

    if response is not None:
        # Customize the response format
        response.data = {
            'error': True,
            'message': response.data.get('detail', 'An error occurred'),
            'status_code': response.status_code
        }

    return response
