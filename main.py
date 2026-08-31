"""
Main application server runner for Dynamic Railway ETA Prediction backend.
"""

import uvicorn


def main():
    print("Starting Dynamic Railway ETA Prediction & Decision Support System...")
    print("Swagger Documentation available at http://localhost:8000/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
