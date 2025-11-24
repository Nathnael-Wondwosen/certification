// Utility function to test API connectivity
export async function testApiConnection() {
  try {
    const response = await fetch('/api/public/health');
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: null,
      data: null,
      error: error.message
    };
  }
}

// Utility function to test authenticated API connectivity
export async function testAuthenticatedApiConnection(token) {
  try {
    const response = await fetch('/api/admin/courses', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: null,
      data: null,
      error: error.message
    };
  }
}