from fastapi import FastAPI
from pydantic import BaseModel

# Crea una instancia de la aplicación FastAPI
app = FastAPI()

# Define un modelo de datos para la solicitud
# Esto ayuda con la validación de datos y la documentación automática
class UserInfo(BaseModel):
    years: int
    name: str
    direction: str

# Define el endpoint de la API
@app.post("/info/")
async def process_info(user_info: UserInfo):
    """
    Recibe la información del usuario (edad, nombre, dirección)
    y devuelve un mensaje de confirmación.
    """
    # return {
    #     "message": f"Entendido, la dirección es '{user_info.direction}', el nombre es '{user_info.name}' y tu edad es '{user_info.years}'"
    # }
    return {
        "message": {
            "direction": user_info.direction, 
            "name": user_info.name, 
            "years": 
            user_info.years
        }
    }

# Si quieres ejecutar esto directamente con `python main.py` (aunque uvicorn es lo recomendado para producción)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
