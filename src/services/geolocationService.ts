export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GeolocationService {
  /**
   * Obtém a posição atual do usuário, encapsulada em uma Promise.
   */
  static async getCurrentPosition(): Promise<Coordinates | null> {
    return new Promise((resolve) => {
      // Verifica se o navegador suporta a API
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        resolve(null);
        return;
      }

      // Pede a posição
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Sucesso
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          // Erro (permissão negada, timeout, etc)
          console.error('Geolocation error:', error);
          resolve(null);
        },
        {
          // Opções para alta precisão (GPS, se disponível)
          enableHighAccuracy: true,
          timeout: 10000, // 10 segundos de timeout
          maximumAge: 0, // Não usar cache
        }
      );
    });
  }

  /**
   * Calcula a distância (em metros) entre duas coordenadas usando a fórmula de Haversine.
   */
  static calculateDistance(
    coord1: Coordinates,
    coord2: Coordinates
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = (coord1.latitude * Math.PI) / 180; // φ, λ em radianos
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // Distância em metros
    return d;
  }

  /**
   * Helper para verificar se uma coordenada está dentro de um raio.
   */
  static isWithinRadius(
    userCoords: Coordinates,
    classCoords: Coordinates,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(userCoords, classCoords);
    return distance <= radiusMeters;
  }

  /**
   * A função principal: obtém a localização do usuário e valida contra a da turma.
   */
  static async validateLocation(
    classLatitude: number,
    classLongitude: number,
    radiusMeters: number
  ): Promise<{ valid: boolean; distance?: number; userCoords?: Coordinates }> {
    // 1. Pega a localização do usuário
    const userCoords = await this.getCurrentPosition();

    // 2. Falha se não conseguir pegar (permissão negada)
    if (!userCoords) {
      return { valid: false };
    }

    // 3. Calcula a distância
    const classCoords = { latitude: classLatitude, longitude: classLongitude };
    const distance = this.calculateDistance(userCoords, classCoords);
    const valid = distance <= radiusMeters;

    // 4. Retorna o objeto completo
    return { valid, distance, userCoords };
  }
}