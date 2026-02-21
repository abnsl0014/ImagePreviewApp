import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class PixelPerfectAPITester:
    def __init__(self, base_url="https://pixelcraft-400.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.uploaded_image_id = None

    def run_test(self, name, method, endpoint, expected_status, files=None, data=None, form_data=False):
        """Run a single API test"""
        url = f"{self.api_base}{endpoint}"
        headers = {}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, timeout=30)
                elif form_data:
                    response = requests.post(url, data=data, timeout=30)
                else:
                    headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.content) if response.content else 0
            }

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    if response.content and response.headers.get('content-type', '').startswith('application/json'):
                        result["response_data"] = response.json()
                except:
                    result["response_data"] = "Non-JSON response"
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    result["error_response"] = response.text[:500] if response.text else "No response body"
                except:
                    result["error_response"] = "Could not read response"

            self.test_results.append(result)
            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "success": False,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, None

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test("API Root", "GET", "/", 200)
        if success:
            try:
                data = response.json()
                if "message" in data and "PixelPerfect" in data["message"]:
                    print("   ✓ API root message correct")
                    return True
                else:
                    print("   ❌ Unexpected API root response")
                    return False
            except:
                print("   ❌ Could not parse API root response")
                return False
        return False

    def test_image_upload(self, test_image_path="/tmp/test_image.png"):
        """Test image upload endpoint"""
        if not os.path.exists(test_image_path):
            print(f"❌ Test image not found: {test_image_path}")
            return False

        try:
            with open(test_image_path, 'rb') as f:
                files = {'file': ('test_image.png', f, 'image/png')}
                success, response = self.run_test(
                    "Image Upload",
                    "POST", 
                    "/image/upload", 
                    200, 
                    files=files
                )
                
            if success:
                try:
                    data = response.json()
                    required_fields = ['id', 'filename', 'width', 'height', 'file_size', 'format']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        print(f"   ❌ Missing required fields: {missing_fields}")
                        return False
                    
                    self.uploaded_image_id = data['id']
                    print(f"   ✓ Image uploaded successfully with ID: {self.uploaded_image_id}")
                    print(f"   ✓ Image info: {data['width']}x{data['height']} {data['format']}")
                    return True
                    
                except Exception as e:
                    print(f"   ❌ Could not parse upload response: {e}")
                    return False
        except Exception as e:
            print(f"❌ Error reading test image: {e}")
            return False
        
        return False

    def test_image_preview(self):
        """Test image preview endpoint"""
        if not self.uploaded_image_id:
            print("❌ No uploaded image ID available for preview test")
            return False

        success, response = self.run_test(
            "Image Preview",
            "GET",
            f"/image/preview/{self.uploaded_image_id}",
            200
        )
        
        if success:
            content_type = response.headers.get('content-type', '')
            if content_type.startswith('image/'):
                print(f"   ✓ Preview image returned with content-type: {content_type}")
                print(f"   ✓ Image size: {len(response.content)} bytes")
                return True
            else:
                print(f"   ❌ Invalid content-type for preview: {content_type}")
                return False
        return False

    def test_image_export(self):
        """Test image export endpoint with different formats"""
        if not self.uploaded_image_id:
            print("❌ No uploaded image ID available for export test")
            return False

        export_tests = [
            {"format": "png", "quality": 95},
            {"format": "jpeg", "quality": 85},
            {"format": "webp", "quality": 90},
        ]

        all_passed = True
        for export_test in export_tests:
            form_data = {
                'image_id': self.uploaded_image_id,
                'format': export_test['format'],
                'quality': str(export_test['quality']),
                'maintain_aspect': 'true'
            }

            success, response = self.run_test(
                f"Image Export ({export_test['format'].upper()})",
                "POST",
                "/image/export",
                200,
                data=form_data
            )

            if success:
                content_type = response.headers.get('content-type', '')
                expected_mime = {
                    'png': 'image/png',
                    'jpeg': 'image/jpeg', 
                    'webp': 'image/webp'
                }
                
                if content_type == expected_mime[export_test['format']]:
                    print(f"   ✓ Export {export_test['format']} successful, size: {len(response.content)} bytes")
                    
                    # Check export headers
                    export_size = response.headers.get('X-Export-Size')
                    if export_size:
                        print(f"   ✓ Export size header: {export_size} bytes")
                else:
                    print(f"   ❌ Wrong content-type for {export_test['format']}: {content_type}")
                    all_passed = False
            else:
                all_passed = False

        return all_passed

    def test_resize_export(self):
        """Test image export with resizing"""
        if not self.uploaded_image_id:
            print("❌ No uploaded image ID available for resize export test")
            return False

        # Test resize with width only (maintain aspect)
        form_data = {
            'image_id': self.uploaded_image_id,
            'format': 'png',
            'quality': '85',
            'width': '400',
            'maintain_aspect': 'true'
        }

        success, response = self.run_test(
            "Resize Export (Width Only)",
            "POST",
            "/image/export",
            200,
            data=form_data
        )

        if success:
            export_width = response.headers.get('X-Export-Width')
            export_height = response.headers.get('X-Export-Height')
            if export_width == '400':
                print(f"   ✓ Resize successful: {export_width}x{export_height}")
                return True
            else:
                print(f"   ❌ Resize failed: expected width 400, got {export_width}")
                return False
        return False

    def test_invalid_requests(self):
        """Test error handling"""
        # Test invalid image ID
        success, response = self.run_test(
            "Invalid Image ID Export",
            "POST",
            "/image/export",
            404,
            data={'image_id': 'invalid-id', 'format': 'png'}
        )

        # Test invalid upload (non-image file)
        try:
            fake_file = {'file': ('test.txt', 'not an image', 'text/plain')}
            success2, response2 = self.run_test(
                "Invalid File Upload",
                "POST",
                "/image/upload",
                400,
                files=fake_file
            )
        except Exception as e:
            print(f"   Expected error for invalid file: {e}")
            success2 = True

        return success and success2

def main():
    print("🧪 Starting PixelPerfect API Tests")
    print("=" * 50)
    
    tester = PixelPerfectAPITester()
    
    # Test sequence
    tests = [
        ("API Root", tester.test_api_root),
        ("Image Upload", tester.test_image_upload),
        ("Image Preview", tester.test_image_preview),
        ("Image Export", tester.test_image_export),
        ("Resize Export", tester.test_resize_export),
        ("Error Handling", tester.test_invalid_requests),
    ]

    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            if not result:
                print(f"❌ {test_name} failed - stopping further tests")
                # Don't break, continue with other tests to get full picture
        except Exception as e:
            print(f"❌ {test_name} crashed: {e}")

    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Save detailed results
    results_file = "/app/backend_test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": round(tester.tests_passed/tester.tests_run*100, 1) if tester.tests_run > 0 else 0
            },
            "test_results": tester.test_results,
            "uploaded_image_id": tester.uploaded_image_id
        }, f, indent=2)
    
    print(f"📄 Detailed results saved to: {results_file}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())