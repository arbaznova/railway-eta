"""
Seed data generator for Dynamic Railway ETA Prediction backend.
Generates realistic reference stations, trains, timetables, section topologies, and historical profile features.
"""

import json
import csv
from pathlib import Path

DATA_DIR = Path(__file__).parent
DATA_DIR.mkdir(parents=True, exist_ok=True)

# 1. Master Stations Reference
STATIONS = [
    {"station_code": "NDLS", "station_name": "New Delhi", "state": "Delhi", "zone": "NR", "latitude": 28.6415, "longitude": 77.2207},
    {"station_code": "NZM", "station_name": "Hazrat Nizamuddin", "state": "Delhi", "zone": "NR", "latitude": 28.5889, "longitude": 77.2536},
    {"station_code": "MTJ", "station_name": "Mathura Junction", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 27.4924, "longitude": 77.6737},
    {"station_code": "AGC", "station_name": "Agra Cantt", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 27.1591, "longitude": 77.9942},
    {"station_code": "GWL", "station_name": "Gwalior Junction", "state": "Madhya Pradesh", "zone": "NCR", "latitude": 26.2163, "longitude": 78.1884},
    {"station_code": "VGLJ", "station_name": "V Lakshmibai Jhansi", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 25.4484, "longitude": 78.5685},
    {"station_code": "BINA", "station_name": "Bina Junction", "state": "Madhya Pradesh", "zone": "WCR", "latitude": 24.1793, "longitude": 78.1843},
    {"station_code": "BPL", "station_name": "Bhopal Junction", "state": "Madhya Pradesh", "zone": "WCR", "latitude": 23.2656, "longitude": 77.4116},
    {"station_code": "RKMP", "station_name": "Rani Kamalapati", "state": "Madhya Pradesh", "zone": "WCR", "latitude": 23.2084, "longitude": 77.4419},
    {"station_code": "KOTA", "station_name": "Kota Junction", "state": "Rajasthan", "zone": "WCR", "latitude": 25.2138, "longitude": 75.8648},
    {"station_code": "RTM", "station_name": "Ratlam Junction", "state": "Madhya Pradesh", "zone": "WR", "latitude": 23.3441, "longitude": 75.0352},
    {"station_code": "BRC", "station_name": "Vadodara Junction", "state": "Gujarat", "zone": "WR", "latitude": 22.3107, "longitude": 73.1812},
    {"station_code": "ST", "station_name": "Surat", "state": "Gujarat", "zone": "WR", "latitude": 21.2049, "longitude": 72.8406},
    {"station_code": "BVI", "station_name": "Borivali", "state": "Maharashtra", "zone": "WR", "latitude": 19.2288, "longitude": 72.8569},
    {"station_code": "MMCT", "station_name": "Mumbai Central", "state": "Maharashtra", "zone": "WR", "latitude": 18.9696, "longitude": 72.8193},
    {"station_code": "CNB", "station_name": "Kanpur Central", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 26.4547, "longitude": 80.3507},
    {"station_code": "PRYJ", "station_name": "Prayagraj Junction", "state": "Uttar Pradesh", "zone": "NCR", "latitude": 25.4447, "longitude": 81.8333},
    {"station_code": "DDU", "station_name": "Pt Deen Dayal Upadhyaya Jn", "state": "Uttar Pradesh", "zone": "ECR", "latitude": 25.2818, "longitude": 83.1189},
    {"station_code": "GAYA", "station_name": "Gaya Junction", "state": "Bihar", "zone": "ECR", "latitude": 24.7955, "longitude": 84.9995},
    {"station_code": "DHN", "station_name": "Dhanbad Junction", "state": "Jharkhand", "zone": "ECR", "latitude": 23.7957, "longitude": 86.4304},
    {"station_code": "ASN", "station_name": "Asansol Junction", "state": "West Bengal", "zone": "ER", "latitude": 23.6871, "longitude": 86.9746},
    {"station_code": "HWH", "station_name": "Howrah Junction", "state": "West Bengal", "zone": "ER", "latitude": 22.5839, "longitude": 88.3426},
    {"station_code": "BSB", "station_name": "Varanasi Junction", "state": "Uttar Pradesh", "zone": "NR", "latitude": 25.3283, "longitude": 82.9863}
]

# 2. Selected Active Demonstration Trains (8 trains)
TRAINS = [
    {
        "train_number": "12002",
        "train_name": "Bhopal Shatabdi Express",
        "train_type": "Shatabdi",
        "zone": "NR",
        "origin": "NDLS",
        "destination": "RKMP",
        "route_corridor": "NDLS-RKMP",
        "station_codes": ["NDLS", "MTJ", "AGC", "GWL", "VGLJ", "BINA", "BPL", "RKMP"]
    },
    {
        "train_number": "20172",
        "train_name": "Vande Bharat Express",
        "train_type": "Vande Bharat",
        "zone": "WCR",
        "origin": "NZM",
        "destination": "RKMP",
        "route_corridor": "NZM-RKMP",
        "station_codes": ["NZM", "AGC", "GWL", "VGLJ", "BPL", "RKMP"]
    },
    {
        "train_number": "12952",
        "train_name": "Mumbai Tejas Rajdhani",
        "train_type": "Rajdhani",
        "zone": "WR",
        "origin": "NDLS",
        "destination": "MMCT",
        "route_corridor": "NDLS-MMCT",
        "station_codes": ["NDLS", "KOTA", "RTM", "BRC", "ST", "BVI", "MMCT"]
    },
    {
        "train_number": "12954",
        "train_name": "August Kranti Rajdhani",
        "train_type": "Rajdhani",
        "zone": "WR",
        "origin": "NZM",
        "destination": "MMCT",
        "route_corridor": "NZM-MMCT",
        "station_codes": ["NZM", "MTJ", "KOTA", "RTM", "BRC", "ST", "BVI", "MMCT"]
    },
    {
        "train_number": "12302",
        "train_name": "Howrah Rajdhani Express",
        "train_type": "Rajdhani",
        "zone": "ER",
        "origin": "NDLS",
        "destination": "HWH",
        "route_corridor": "NDLS-HWH",
        "station_codes": ["NDLS", "CNB", "PRYJ", "DDU", "GAYA", "DHN", "ASN", "HWH"]
    },
    {
        "train_number": "12260",
        "train_name": "Sealdah Duronto Express",
        "train_type": "Duronto",
        "zone": "ER",
        "origin": "NDLS",
        "destination": "HWH",
        "route_corridor": "NDLS-HWH",
        "station_codes": ["NDLS", "CNB", "PRYJ", "DDU", "DHN", "HWH"]
    },
    {
        "train_number": "22436",
        "train_name": "Varanasi Vande Bharat Express",
        "train_type": "Vande Bharat",
        "zone": "NR",
        "origin": "NDLS",
        "destination": "BSB",
        "route_corridor": "NDLS-BSB",
        "station_codes": ["NDLS", "CNB", "PRYJ", "BSB"]
    },
    {
        "train_number": "12560",
        "train_name": "Shiv Ganga Express",
        "train_type": "Superfast",
        "zone": "NER",
        "origin": "NDLS",
        "destination": "BSB",
        "route_corridor": "NDLS-BSB",
        "station_codes": ["NDLS", "CNB", "PRYJ", "BSB"]
    }
]

# Section distances (km) and default traversal minutes
INTER_STATION_METRICS = {
    ("NDLS", "MTJ"): (141.0, 105.0),
    ("MTJ", "AGC"): (54.0, 42.0),
    ("AGC", "GWL"): (118.0, 78.0),
    ("GWL", "VGLJ"): (98.0, 68.0),
    ("VGLJ", "BINA"): (153.0, 115.0),
    ("BINA", "BPL"): (139.0, 100.0),
    ("BPL", "RKMP"): (6.4, 12.0),
    ("NZM", "AGC"): (188.0, 115.0),
    ("NZM", "MTJ"): (134.0, 95.0),
    ("VGLJ", "BPL"): (292.0, 195.0),
    ("NDLS", "KOTA"): (465.0, 270.0),
    ("MTJ", "KOTA"): (324.0, 195.0),
    ("KOTA", "RTM"): (267.0, 175.0),
    ("RTM", "BRC"): (260.0, 190.0),
    ("BRC", "ST"): (130.0, 95.0),
    ("ST", "BVI"): (234.0, 160.0),
    ("BVI", "MMCT"): (30.0, 35.0),
    ("NDLS", "CNB"): (440.0, 280.0),
    ("CNB", "PRYJ"): (194.0, 130.0),
    ("PRYJ", "DDU"): (153.0, 110.0),
    ("DDU", "GAYA"): (205.0, 145.0),
    ("GAYA", "DHN"): (201.0, 140.0),
    ("DHN", "ASN"): (58.0, 48.0),
    ("ASN", "HWH"): (200.0, 140.0),
    ("DDU", "DHN"): (406.0, 270.0),
    ("DHN", "HWH"): (258.0, 180.0),
    ("PRYJ", "BSB"): (124.0, 90.0)
}

def generate_all_data():
    # Save stations.json
    with open(DATA_DIR / "stations.json", "w", encoding="utf-8") as f:
        json.dump(STATIONS, f, indent=2)

    # Save trains.json
    trains_clean = []
    for t in TRAINS:
        trains_clean.append({
            "train_number": t["train_number"],
            "train_name": t["train_name"],
            "train_type": t["train_type"],
            "zone": t["zone"],
            "origin": t["origin"],
            "destination": t["destination"],
            "route_corridor": t["route_corridor"]
        })
    with open(DATA_DIR / "trains.json", "w", encoding="utf-8") as f:
        json.dump(trains_clean, f, indent=2)

    # Build schedules.json and route_sections
    schedules = []
    route_sections_set = {}
    
    # Start schedule base time: morning 06:00
    for train in TRAINS:
        t_num = train["train_number"]
        st_codes = train["station_codes"]
        current_minute = 360 # 06:00 AM
        
        for idx, st in enumerate(st_codes):
            arr_h = (current_minute // 60) % 24
            arr_m = current_minute % 60
            arr_str = f"{arr_h:02d}:{arr_m:02d}"
            
            # Halts: 2 to 5 mins, except origin/destination
            halt_mins = 0 if (idx == 0 or idx == len(st_codes) - 1) else 5
            dep_minute = current_minute + halt_mins
            dep_h = (dep_minute // 60) % 24
            dep_m = dep_minute % 60
            dep_str = f"{dep_h:02d}:{dep_m:02d}"
            
            schedules.append({
                "train_number": t_num,
                "station_code": st,
                "station_sequence": idx + 1,
                "scheduled_arrival": arr_str if idx > 0 else None,
                "scheduled_departure": dep_str if idx < len(st_codes) - 1 else None,
                "day_number": (current_minute // 1440) + 1,
                "distance_from_origin_km": 0.0
            })
            
            # Calculate next section
            if idx < len(st_codes) - 1:
                next_st = st_codes[idx + 1]
                pair = (st, next_st)
                dist, duration = INTER_STATION_METRICS.get(pair, (50.0, 45.0))
                current_minute = dep_minute + int(duration)
                
                sec_id = f"{st}_{next_st}"
                if sec_id not in route_sections_set:
                    route_sections_set[sec_id] = {
                        "section_id": sec_id,
                        "from_station": st,
                        "to_station": next_st,
                        "geo_distance_km": dist,
                        "scheduled_section_minutes": duration,
                        "route_context": train["route_corridor"]
                    }

    with open(DATA_DIR / "schedules.json", "w", encoding="utf-8") as f:
        json.dump(schedules, f, indent=2)

    # Save route_sections.csv
    sections_list = list(route_sections_set.values())
    with open(DATA_DIR / "route_sections.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["section_id", "from_station", "to_station", "geo_distance_km", "scheduled_section_minutes", "route_context"])
        writer.writeheader()
        writer.writerows(sections_list)

    # Save train_historical_profiles.csv
    train_profiles = [
        {"train_number": "12002", "historical_avg_delay_minutes": 14.5, "historical_ontime_pct": 82.0, "route_historical_ontime_pct": 79.5},
        {"train_number": "20172", "historical_avg_delay_minutes": 8.2, "historical_ontime_pct": 91.5, "route_historical_ontime_pct": 88.0},
        {"train_number": "12952", "historical_avg_delay_minutes": 18.0, "historical_ontime_pct": 85.0, "route_historical_ontime_pct": 82.0},
        {"train_number": "12954", "historical_avg_delay_minutes": 22.4, "historical_ontime_pct": 78.5, "route_historical_ontime_pct": 80.0},
        {"train_number": "12302", "historical_avg_delay_minutes": 28.6, "historical_ontime_pct": 72.0, "route_historical_ontime_pct": 74.0},
        {"train_number": "12260", "historical_avg_delay_minutes": 31.2, "historical_ontime_pct": 69.5, "route_historical_ontime_pct": 71.0},
        {"train_number": "22436", "historical_avg_delay_minutes": 9.5, "historical_ontime_pct": 93.0, "route_historical_ontime_pct": 86.5},
        {"train_number": "12560", "historical_avg_delay_minutes": 25.0, "historical_ontime_pct": 75.0, "route_historical_ontime_pct": 76.0}
    ]
    with open(DATA_DIR / "train_historical_profiles.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["train_number", "historical_avg_delay_minutes", "historical_ontime_pct", "route_historical_ontime_pct"])
        writer.writeheader()
        writer.writerows(train_profiles)

    # Save station_historical_profiles.csv
    station_profiles = []
    for st in STATIONS:
        code = st["station_code"]
        avg_delay = 12.0 if code in ["NDLS", "HWH", "MMCT", "CNB"] else 8.5
        station_profiles.append({
            "station_code": code,
            "station_historical_delay_minutes": avg_delay,
            "station_profile_available": 1
        })
    with open(DATA_DIR / "station_historical_profiles.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["station_code", "station_historical_delay_minutes", "station_profile_available"])
        writer.writeheader()
        writer.writerows(station_profiles)

    # Save section_base_features.csv
    section_base = []
    for s in sections_list:
        sec_id = s["section_id"]
        has_high_traffic = any(j in sec_id for j in ["NDLS", "CNB", "AGC", "MMCT"])
        section_base.append({
            "section_id": sec_id,
            "geo_distance_km": s["geo_distance_km"],
            "scheduled_section_minutes": s["scheduled_section_minutes"],
            "avg_fog_risk_score": 0.45 if any(x in sec_id for x in ["CNB", "PRYJ", "DDU"]) else 0.10,
            "avg_zone_congestion_index": 0.75 if has_high_traffic else 0.40,
            "avg_season_severity_score": 0.35,
            "avg_psr_count": 2.0 if has_high_traffic else 1.0
        })
    with open(DATA_DIR / "section_base_features.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["section_id", "geo_distance_km", "scheduled_section_minutes", "avg_fog_risk_score", "avg_zone_congestion_index", "avg_season_severity_score", "avg_psr_count"])
        writer.writeheader()
        writer.writerows(section_base)

    print(f"Generated all reference and seed files in {DATA_DIR} successfully!")

if __name__ == "__main__":
    generate_all_data()
