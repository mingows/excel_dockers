import json
import os
import requests
from datetime import datetime, timedelta

# --- Utility Function Stubs (mimicking utils.js) ---
# In a real scenario, these would be in a separate utils.py or use robust libraries.

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def write_log(message, level, global_config):
    """Simplified logger."""
    timestamp = datetime.now().isoformat()
    # In a real app, extract caller info or use Python's logging module
    log_message = f"{timestamp}[data_extractor.py][{level}] {message}"
    print(log_message)
    if global_config and global_config.get('workingPath'):
        log_dir = os.path.join(global_config['workingPath'], 'logs')
        os.makedirs(log_dir, exist_ok=True)
        try:
            with open(os.path.join(log_dir, 'log.txt'), 'a', encoding='utf-8') as f:
                f.write(log_message + '\n')
        except Exception:
            pass # Avoid logging errors to prevent loops if logging itself fails

def write_file(file_path, content, global_config):
    """Simplified file writer."""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        # write_log(f"Successfully wrote to {file_path}", "DEBUG", global_config)
    except Exception as e:
        write_log(f"Error writing file {file_path}: {e}", "ERROR", global_config)

def english_date_validation(date_string):
    """Validates MM/DD/YYYY date format."""
    try:
        datetime.strptime(date_string, '%m/%d/%Y')
        return True
    except ValueError:
        return False

def order_settlements_by_month(settlements):
    """Orders settlements, ensuring 'TOTAL' is last."""
    def get_sort_key(s):
        if s.get('month', '').upper() == "TOTAL":
            return (1, None)  # Sort "TOTAL" entries last
        try:
            # Use 'settlementMonth' which is YYYY-MM-DD
            dt = datetime.strptime(s['settlementMonth'], '%Y-%m-%d')
            return (0, dt) # Sort valid dates first, then by date
        except (TypeError, ValueError, KeyError):
            # Fallback for entries without a valid 'settlementMonth'
            return (1, datetime.max) # Treat as "last" among non-TOTAL if problematic
    return sorted(settlements, key=get_sort_key)

# --- End Utility Function Stubs ---


def _fetch_cme_group_data(date_str, global_config, api_id, api_t_param, origin_name, table_key, temp_file_name_suffix, fetch_function_ref):
    """Helper function to fetch and process CME Group data."""
    if not date_str:
        # Default to current date if not provided, though index.js always provides it.
        # The original JS had an unused nowEnd/formattedDateEnd here.
        now_end = datetime.now()
        date_str = now_end.strftime('%m/%d/%Y') # MM/DD/YYYY
    elif not english_date_validation(date_str):
        write_log(f"Error: date format is not valid: {date_str}", "ERROR", global_config)
        return {
            "statusCode": 400,
            "statusDescription": "Wrong date format. Expected format: MM/DD/YYYY"
        }

    result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }

    options = {
        'method': 'GET',
        'url': f'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/{api_id}/FUT?strategy=DEFAULT&tradeDate={date_str}&pageSize=500&isProtected&_t={api_t_param}',
        'headers': {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6',
        }
    }

    try:
        response = requests.request(options['method'], options['url'], headers=options['headers'], timeout=30)
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        response_body = response.json()

        if response_body.get("empty") is True:
            write_log(f"No data found for date: {date_str} for {origin_name}. Fetching previous day.", "WARN", global_config)
            date_to_process_obj = datetime.strptime(date_str, "%m/%d/%Y") - timedelta(days=1)
            formatted_date_to_process = date_to_process_obj.strftime("%m/%d/%Y")
            return fetch_function_ref(formatted_date_to_process, global_config)

        settlements_order = order_settlements_by_month(response_body.get("settlements", []))
        
        current_t_date = datetime.now()
        current_trade_date_str = current_t_date.strftime("%d/%m/%Y") # DD/MM/YYYY

        line_info = {
            "date": current_trade_date_str,
            "volume": 9999  # Default
        }
        line_tmp = {
            "date": f"${{table:{table_key}.date}}",
            "volume": f"${{table:{table_key}.volume}}"
        }

        for index, settlement in enumerate(settlements_order):
            month_name = settlement.get("month", "").upper()
            if month_name != "TOTAL":
                try:
                    line_info[f"month{index + 1}"] = float(settlement.get("settle", "0"))
                except ValueError:
                    line_info[f"month{index + 1}"] = 0.0
                line_tmp[f"month{index + 1}"] = f"${{table:{table_key}.month{index + 1}}}"
            else:
                volume_str = settlement.get("volume", "0").replace(',', '.') # Assumes comma as decimal separator
                try:
                    line_info["volume"] = float(volume_str)
                except ValueError:
                    line_info["volume"] = 0.0
                # Keep line_info["date"] as current_trade_date_str (DD/MM/YYYY string) for consistency
                # The original JS was inconsistent here. This version aims for consistent output.
                line_info["date"] = current_trade_date_str


        data_line_info = [line_info]
        data_line_tmp = [line_tmp]

        current_date_for_resume = datetime.now()
        formatted_current_date_resume = current_date_for_resume.strftime('%Y-%m-%d %H:%M:%S')
        
        settlement_resume = {
            "date": formatted_current_date_resume,
            "tradeDate": response_body.get("tradeDate"), # Usually MM/DD/YYYY
            "origin": origin_name,
            "amount": len(response_body.get("settlements", [])) - 1 if response_body.get("settlements") else 0 # Exclude TOTAL
        }
        data_line_resume = [settlement_resume]

        result["data"] = {
            "lineInfo": data_line_info,
            "lineTmp": data_line_tmp,
            "resume": data_line_resume
        }
        
        temp_file_path = os.path.join(SCRIPT_DIR, "tmp", f"cmegroup-{temp_file_name_suffix}.json")
        write_file(temp_file_path, json.dumps(result["data"], indent=2), global_config)
        return result

    except requests.exceptions.HTTPError as http_err:
        write_log(f"HTTP error occurred for {origin_name}: {http_err} - {response.text}", "ERROR", global_config)
        status_code = response.status_code if 'response' in locals() else 500
        description = str(http_err)
    except requests.exceptions.RequestException as req_err:
        write_log(f"Request error occurred for {origin_name}: {req_err}", "ERROR", global_config)
        status_code = 503 # Service Unavailable or network issue
        description = str(req_err)
    except json.JSONDecodeError as json_err:
        write_log(f"JSON decode error for {origin_name}: {json_err}", "ERROR", global_config)
        status_code = 500
        description = f"Failed to decode JSON response: {json_err}"
    except Exception as error:
        write_log(f"Generic error on {origin_name} request: {error}", "ERROR", global_config)
        status_code = 500
        description = str(error)

    # Common error response structure
    result["statusCode"] = status_code
    result["statusDescription"] = description
    
    current_date_for_error_resume = datetime.now()
    formatted_current_date_error_resume = current_date_for_error_resume.strftime('%Y-%m-%d %H:%M:%S')
    error_settlement_resume = {
        "date": formatted_current_date_error_resume,
        "tradeDate": "Unknown",
        "origin": origin_name,
        "amount": "ERROR"
    }
    result["data"] = {
        "lineInfo": [],
        "lineTmp": [],
        "resume": [error_settlement_resume]
    }
    temp_file_path = os.path.join(SCRIPT_DIR, "tmp", f"cmegroup-{temp_file_name_suffix}.json")
    write_file(temp_file_path, json.dumps(result["data"], indent=2), global_config)
    return result


def get_cme_group_chicago(date_str, global_config):
    """Gets CMEGroup data from Chicago."""
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="4708",
        api_t_param="1747732336411",
        origin_name="CMEGroup Chicago-CU",
        table_key="CU",
        temp_file_name_suffix="chicago-cu",
        fetch_function_ref=get_cme_group_chicago # Pass self for recursion
    )

def get_cme_group_ny(date_str, global_config):
    """Gets CMEGroup data from NY."""
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="4759",
        api_t_param="1748329926274",
        origin_name="CMEGroup New York-NYH",
        table_key="NYH",
        temp_file_name_suffix="new-york-nyh",
        fetch_function_ref=get_cme_group_ny
    )

def get_cme_group_t2(date_str, global_config):
    """Gets CMEGroup data for T2."""
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="5187",
        api_t_param="1748509061872",
        origin_name="CMEGroup T2",
        table_key="T2",
        temp_file_name_suffix="t2",
        fetch_function_ref=get_cme_group_t2
    )

# --- Stubs for other functions mentioned in module.exports of dataExtractor.js ---

def get_cme_group_corn(date_str, global_config):
    write_log("getCmeGroupCorn is not implemented.", "WARN", global_config)
    return {
        "statusCode": 501, # Not Implemented
        "statusDescription": "Function getCmeGroupCorn is not implemented.",
        "data": {"lineInfo": [], "lineTmp": [], "resume": [{"date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "tradeDate": "N/A", "origin": "CMEGroup Corn", "amount": "NI"}]}
    }

def get_cme_group_rbob(date_str, global_config):
    write_log("getCmeGroupRbob is not implemented.", "WARN", global_config)
    return {
        "statusCode": 501,
        "statusDescription": "Function getCmeGroupRbob is not implemented.",
        "data": {"lineInfo": [], "lineTmp": [], "resume": [{"date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "tradeDate": "N/A", "origin": "CMEGroup RBOB", "amount": "NI"}]}
    }

def get_cme_group_sugar11(date_str, global_config):
    write_log("getCmeGroupSugar11 is not implemented.", "WARN", global_config)
    return {
        "statusCode": 501,
        "statusDescription": "Function getCmeGroupSugar11 is not implemented.",
        "data": {"lineInfo": [], "lineTmp": [], "resume": [{"date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "tradeDate": "N/A", "origin": "CMEGroup Sugar 11", "amount": "NI"}]}
    }

import json
import os
import requests
from datetime import datetime, timedelta

# Assuming utils.py is in the same directory or accessible in PYTHONPATH
# These would be imported from your utils.py
# from utils import write_log, write_file, english_date_validation
# For demonstration, stubs are included here if utils.py is not directly runnable with this script alone.

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Utility Function Stubs (mimicking utils.js/utils.py) ---
# In a real scenario, these would be in your utils.py.
# These are simplified versions. Your actual utils.py might be more complex.

def _ensure_log_dir(global_config):
    if global_config and global_config.get('workingPath'):
        log_dir = os.path.join(global_config['workingPath'], 'logs')
        os.makedirs(log_dir, exist_ok=True)
        return os.path.join(log_dir, 'log.txt')
    return None

def write_log(message, level, global_config):
    timestamp = datetime.now().isoformat()
    # Simplified caller info for stub
    log_message = f"{timestamp}[data_extractor.py][{level}] {message}"
    print(log_message)
    log_file_path = _ensure_log_dir(global_config)
    if log_file_path:
        try:
            with open(log_file_path, 'a', encoding='utf-8') as f:
                f.write(log_message + '\n')
        except Exception:
            pass

def write_file(file_path, content, global_config=None): # global_config can be optional for simple writes
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    except Exception as e:
        err_msg = f"Error writing file {file_path}: {e}"
        if global_config:
            write_log(err_msg, "ERROR", global_config)
        else:
            print(err_msg)

def english_date_validation(date_string):
    try:
        datetime.strptime(date_string, '%m/%d/%Y')
        return True
    except ValueError:
        return False

# --- End Utility Function Stubs ---

def _order_settlements_by_month_local(settlements):
    """
    Orders settlements by 'settlementMonth', ensuring 'TOTAL' is last.
    'settlementMonth' from API is YYYY-MM-DD.
    """
    def get_sort_key(s):
        month_display = s.get('month', '').upper()
        settlement_month_str = s.get('settlementMonth')

        if month_display == "TOTAL":
            return (2, None)  # Sort "TOTAL" entries absolutely last

        if settlement_month_str:
            try:
                # CME API provides settlementMonth in 'YYYY-MM-DD' format
                dt_obj = datetime.strptime(settlement_month_str, '%Y-%m-%d')
                return (0, dt_obj) # Sort valid dates first, then by date
            except (ValueError, TypeError):
                # Fallback if settlementMonth is not in the expected format for some reason
                return (1, month_display) # Sort next by display month string
        
        # If no settlementMonth and not TOTAL, sort by display month string
        return (1, month_display)

    return sorted(settlements, key=get_sort_key)


def _fetch_cme_group_data(
    date_str, global_config,
    api_id, api_t_param,
    origin_name, table_key, temp_file_name_suffix,
    fetch_function_ref,
    parse_settle_func, parse_volume_func
):
    """Helper function to fetch and process CME Group data."""
    if not date_str:
        # This case might not be hit if index.js always provides a date
        now_end = datetime.now()
        date_str = now_end.strftime('%m/%d/%Y') # MM/DD/YYYY
    elif not english_date_validation(date_str):
        write_log(f"Error: date format is not valid: {date_str} for {origin_name}", "ERROR", global_config)
        return {
            "statusCode": 400,
            "statusDescription": "Wrong date format. Expected format: MM/DD/YYYY"
        }

    result = {"statusCode": 200, "statusDescription": "OK"}
    api_url = f'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/{api_id}/FUT?strategy=DEFAULT&tradeDate={date_str}&pageSize=500&isProtected&_t={api_t_param}'
    
    options = {
        'method': 'GET',
        'url': api_url,
        'headers': {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd', # requests handles this
            'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6',
        }
    }

    response_obj = None # To store response for logging in case of HTTPError

    try:
        response_obj = requests.request(options['method'], options['url'], headers=options['headers'], timeout=30)
        response_obj.raise_for_status()
        response_body = response_obj.json()

        if response_body.get("empty") is True:
            write_log(f"No data found for date: {date_str} for {origin_name}. Fetching previous day.", "WARN", global_config)
            date_to_process_obj = datetime.strptime(date_str, "%m/%d/%Y") - timedelta(days=1)
            formatted_date_to_process = date_to_process_obj.strftime("%m/%d/%Y")
            # Recursive call to the original specific function (e.g., get_cme_group_corn)
            return fetch_function_ref(formatted_date_to_process, global_config)

        settlements_order = _order_settlements_by_month_local(response_body.get("settlements", []))
        
        current_t_date = datetime.now()
        # This is the date the script runs, formatted as DD/MM/YYYY for lineInfo.date
        current_run_date_ddmmyyyy = current_t_date.strftime("%d/%m/%Y")

        line_info = {
            "date": current_run_date_ddmmyyyy, # Date of data processing
            "volume": 9999.0  # Default, will be updated
        }
        line_tmp = {
            "date": f"${{table:{table_key}.date}}",
            "volume": f"${{table:{table_key}.volume}}"
        }

        for index, settlement in enumerate(settlements_order):
            month_name = settlement.get("month", "").upper()
            if month_name != "TOTAL":
                try:
                    settle_val_str = settlement.get("settle", "0")
                    line_info[f"month{index + 1}"] = parse_settle_func(settle_val_str)
                except (ValueError, TypeError) as e:
                    write_log(f"Error parsing settle value '{settle_val_str}' for {origin_name}, month {month_name}: {e}", "ERROR", global_config)
                    line_info[f"month{index + 1}"] = 0.0
                line_tmp[f"month{index + 1}"] = f"${{table:{table_key}.month{index + 1}}}"
            else: # "TOTAL" entry
                volume_str = settlement.get("volume", "0")
                try:
                    line_info["volume"] = parse_volume_func(volume_str)
                except (ValueError, TypeError) as e:
                    write_log(f"Error parsing total volume value '{volume_str}' for {origin_name}: {e}", "ERROR", global_config)
                    line_info["volume"] = 0.0
                # lineInfo.date remains current_run_date_ddmmyyyy, consistent with initialization.
                # JS code was: lineInfo.date = tradeDateObj (a Date object).
                # Python version keeps it as "DD/MM/YYYY" string.

        data_line_info = [line_info]
        data_line_tmp = [line_tmp]

        current_date_for_resume_iso = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        settlement_resume = {
            "date": current_date_for_resume_iso, # Timestamp of when the resume entry was created
            "tradeDate": response_body.get("tradeDate"), # Actual trade date from API (MM/DD/YYYY)
            "origin": origin_name,
            "amount": len([s for s in response_body.get("settlements", []) if s.get("month","").upper() != "TOTAL"])
        }
        data_line_resume = [settlement_resume]

        result["data"] = {
            "lineInfo": data_line_info,
            "lineTmp": data_line_tmp,
            "resume": data_line_resume
        }
        
        temp_file_path = os.path.join(SCRIPT_DIR, "tmp", f"cmegroup-{temp_file_name_suffix}.json")
        write_file(temp_file_path, json.dumps(result["data"], indent=2), global_config)
        return result

    except requests.exceptions.HTTPError as http_err:
        err_text = response_obj.text if response_obj else "No response body"
        write_log(f"HTTP error occurred for {origin_name}: {http_err} - {err_text}", "ERROR", global_config)
        status_code = response_obj.status_code if response_obj else 500
        description = str(http_err)
    except requests.exceptions.RequestException as req_err:
        write_log(f"Request error occurred for {origin_name}: {req_err}", "ERROR", global_config)
        status_code = 503
        description = str(req_err)
    except json.JSONDecodeError as json_err:
        write_log(f"JSON decode error for {origin_name}: {json_err}", "ERROR", global_config)
        status_code = 500
        description = f"Failed to decode JSON response: {json_err}"
    except Exception as error:
        write_log(f"Generic error in {origin_name} request processing: {error}", "ERROR", global_config)
        status_code = 500
        description = str(error)

    result["statusCode"] = status_code
    result["statusDescription"] = description
    
    error_resume_date_iso = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    error_settlement_resume = {
        "date": error_resume_date_iso,
        "tradeDate": date_str if 'date_str' in locals() else "Unknown", # Use input date if available
        "origin": origin_name,
        "amount": "ERROR"
    }
    result["data"] = {
        "lineInfo": [], "lineTmp": [], "resume": [error_settlement_resume]
    }
    temp_file_path = os.path.join(SCRIPT_DIR, "tmp", f"cmegroup-{temp_file_name_suffix}.json")
    write_file(temp_file_path, json.dumps(result["data"], indent=2), global_config)
    return result

# --- Functions from previous migration (dataExtractor_1.1.js) ---
def get_cme_group_chicago(date_str, global_config):
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="4708", api_t_param="1747732336411",
        origin_name="CMEGroup Chicago-CU", table_key="CU", temp_file_name_suffix="chicago-cu",
        fetch_function_ref=get_cme_group_chicago,
        parse_settle_func=lambda s: float(s.replace(',', '.')), # JS: .replace('.', ',') was for display, float needs .
        parse_volume_func=lambda s: float(s.replace(',', '.'))  # JS: .replace('.', ',')
    )

def get_cme_group_ny(date_str, global_config):
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="4759", api_t_param="1748329926274",
        origin_name="CMEGroup New York-NYH", table_key="NYH", temp_file_name_suffix="new-york-nyh",
        fetch_function_ref=get_cme_group_ny,
        parse_settle_func=lambda s: float(s.replace(',', '.')),
        parse_volume_func=lambda s: float(s.replace(',', '.'))
    )

def get_cme_group_t2(date_str, global_config):
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="5187", api_t_param="1748509061872",
        origin_name="CMEGroup T2", table_key="T2", temp_file_name_suffix="t2",
        fetch_function_ref=get_cme_group_t2,
        parse_settle_func=lambda s: float(s.replace(',', '.')),
        parse_volume_func=lambda s: float(s.replace(',', '.'))
    )

# --- Functions from current dataExtractor.js ---
def get_cme_group_corn(date_str, global_config):
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="300", api_t_param="1748513906708",
        origin_name="CMEGroup Corn", table_key="CORN", temp_file_name_suffix="corn",
        fetch_function_ref=get_cme_group_corn,
        parse_settle_func=lambda s: float(s.replace("'", ".")), # JS: parseFloat(settlement.settle.replace("'", "."))
        parse_volume_func=lambda s: float(s.replace(",", "."))  # JS: parseFloat(settlement.volume.replace(",", "."))
    )

def get_cme_group_rbob(date_str, global_config):
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="429", api_t_param="1748515985882",
        origin_name="CMEGroup RBob", table_key="RBOB", temp_file_name_suffix="rbob",
        fetch_function_ref=get_cme_group_rbob,
        parse_settle_func=lambda s: float(s),                   # JS: parseFloat(settlement.settle)
        parse_volume_func=lambda s: float(s.replace(",", "."))  # JS: parseFloat(settlement.volume.replace(',', '.'))
    )

def get_cme_group_sugar11(date_str, global_config):
    return _fetch_cme_group_data(
        date_str, global_config,
        api_id="470", api_t_param="1748518295308",
        origin_name="CMEGroup Sugar 11", table_key="Sugar 11", temp_file_name_suffix="sugar-11", # Note space in table_key
        fetch_function_ref=get_cme_group_sugar11,
        parse_settle_func=lambda s: float(s),                   # JS: parseFloat(settlement.settle)
        parse_volume_func=lambda s: float(s.replace(",", "."))  # JS: parseFloat(settlement.volume.replace(',', '.'))
    )

def get_esalq_paulinia(date_str, global_config):
    # This function is empty in the JavaScript file.
    write_log("get_esalq_paulinia is not implemented.", "WARN", global_config)
    return {
        "statusCode": 501,
        "statusDescription": "Function get_esalq_paulinia is not implemented.",
        "data": {"lineInfo": [], "lineTmp": [], "resume": [{"date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'), "tradeDate": date_str or "N/A", "origin": "ESALQ Paulinia", "amount": "NI"}]}
    }

def get_empty(date_str, global_config=None):
    return {
        "statusCode": 200,
        "statusDescription": "OK"
    }

# --- Main execution for testing ---
if __name__ == '__main__':
    mock_global_config = {
        "workingPath": SCRIPT_DIR, # For logs and temp files
        # Add other necessary global_config keys if your utils.py expects them
    }
    
    # Ensure tmp directory exists for testing
    os.makedirs(os.path.join(SCRIPT_DIR, "tmp"), exist_ok=True)
    
    # Test date (example: a few days ago, or a fixed date for repeatable tests)
    # test_date_obj = datetime.now() - timedelta(days=3)
    # test_date_str_api = test_date_obj.strftime('%m/%d/%Y') # MM/DD/YYYY for API
    
    # Using a fixed date known to have data or be empty for testing recursion
    test_date_str_api = "05/28/2024" # Adjust as needed for testing

    print(f"--- Testing with date: {test_date_str_api} ---")

    print("\n--- Testing get_cme_group_chicago ---")
    chicago_data = get_cme_group_chicago(test_date_str_api, mock_global_config)
    print(json.dumps(chicago_data, indent=2))

    print("\n--- Testing get_cme_group_ny ---")
    ny_data = get_cme_group_ny(test_date_str_api, mock_global_config)
    print(json.dumps(ny_data, indent=2))

    print("\n--- Testing get_cme_group_t2 ---")
    t2_data = get_cme_group_t2(test_date_str_api, mock_global_config)
    print(json.dumps(t2_data, indent=2))

    print("\n--- Testing get_cme_group_corn ---")
    corn_data = get_cme_group_corn(test_date_str_api, mock_global_config)
    print(json.dumps(corn_data, indent=2))

    print("\n--- Testing get_cme_group_rbob ---")
    rbob_data = get_cme_group_rbob(test_date_str_api, mock_global_config)
    print(json.dumps(rbob_data, indent=2))

    print("\n--- Testing get_cme_group_sugar11 ---")
    sugar_data = get_cme_group_sugar11(test_date_str_api, mock_global_config)
    print(json.dumps(sugar_data, indent=2))
    
    print("\n--- Testing get_esalq_paulinia (stub) ---")
    esalq_data = get_esalq_paulinia(test_date_str_api, mock_global_config)
    print(json.dumps(esalq_data, indent=2))

    print("\n--- Testing get_empty ---")
    empty_data = get_empty(test_date_str_api, mock_global_config)
    print(json.dumps(empty_data, indent=2))




def get_empty(date_str, global_config=None): # Added global_config for consistency if it were to log
    """Gets an empty successful result."""
    return {
        "statusCode": 200,
        "statusDescription": "OK"
    }

if __name__ == '__main__':
    # Example usage (mimicking parts of index.js for testing)
    mock_global_config = {
        "workingPath": SCRIPT_DIR # For logs and temp files
    }
    
    # Test date (yesterday)
    # test_date_obj = datetime.now() - timedelta(days=1)
    # test_date_str = test_date_obj.strftime('%m/%d/%Y') # MM/DD/YYYY
    
    # Use a fixed date for more predictable testing if API allows past dates easily
    test_date_str = "05/23/2025" # Example date that might have data

    print(f"--- Testing getCmeGroupChicago for date: {test_date_str} ---")
    chicago_data = get_cme_group_chicago(test_date_str, mock_global_config)
    print(json.dumps(chicago_data, indent=2))
    print("\n")

    print(f"--- Testing getCmeGroupNY for date: {test_date_str} ---")
    ny_data = get_cme_group_ny(test_date_str, mock_global_config)
    print(json.dumps(ny_data, indent=2))
    print("\n")

    print(f"--- Testing getCmeGroupT2 for date: {test_date_str} ---")
    t2_data = get_cme_group_t2(test_date_str, mock_global_config)
    print(json.dumps(t2_data, indent=2))
    print("\n")

    print(f"--- Testing getCmeGroupCorn (stub) ---")
    corn_data = get_cme_group_corn(test_date_str, mock_global_config)
    print(json.dumps(corn_data, indent=2))
    print("\n")
    
    print(f"--- Testing getEmpty (stub) ---")
    empty_data = get_empty(test_date_str, mock_global_config)
    print(json.dumps(empty_data, indent=2))

