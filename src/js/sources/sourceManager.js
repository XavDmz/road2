'use strict';

const assert = require('assert').strict;
const storageManager = require('../utils/storageManager');
const osrmSource = require('../sources/osrmSource');
const pgrSource = require('../sources/pgrSource');
const log4js = require('log4js');

// Création du LOGGER
var LOGGER = log4js.getLogger("SOURCEMANAGER");

module.exports = class sourceManager {

  /**
  *
  * @function
  * @name constructor
  * @description Constructeur de la classe sourceManager
  *
  */
  constructor() {

    // Liste des ids des sources gérées par le manager
    this._listOfSourceIds = new Array();

    // Description des sources conservées de manière unique dans _listOfSourceIds
    this._sourceDescriptions = {};

  }

  /**
  *
  * @function
  * @name get listOfSourceIds
  * @description Récupérer l'ensemble des ids de sources
  *
  */
  get listOfSourceIds() {
    return this._listOfSourceIds;
  }

  /**
  *
  * @function
  * @name get sourceDescriptions
  * @description Récupérer l'ensemble des descriptions des sources conservées
  *
  */
  get sourceDescriptions() {
    return this._sourceDescriptions;
  }

  /**
  *
  * @function
  * @name set listOfSourceIds
  * @description Attribuer l'ensemble des ids de sources
  *
  */
  set listOfSourceIds(list) {
    this._listOfSourceIds = list;
  }

  /**
  *
  * @function
  * @name set sourceDescriptions
  * @description Attribuer l'ensemble des descriptions des sources conservées
  *
  */
  set sourceDescriptions(descriptions) {
    this._sourceDescriptions = descriptions;
  }

  /**
  *
  * @function
  * @name getSourceDescriptionById
  * @description Récupérer la description de la source indiquée par son id
  *
  */
  getSourceDescriptionById(id) {
    if (this._sourceDescriptions[id]) {
      return this._sourceDescriptions[id];
    } else {
      return {};
    }

  }

  /**
  *
  * @function
  * @name checkSource
  * @description Fonction utilisée pour vérifier la partie source d'un fichier de description d'une ressource.
  * @param {json} sourceJsonObject - Description JSON de la source
  * @param {object} operationManager - Le manager des opérations du service
  * @param {table} resourceOperationTable - Tableau contenant l'ensemble des id d'opérations disponibles pour cette ressource
  * @return {boolean} vrai si tout c'est bien passé et faux s'il y a eu une erreur
  *
  */

  checkSource(sourceJsonObject, operationManager, resourceOperationTable) {

    LOGGER.info("Verification de la source...");

    // ID
    if (!sourceJsonObject.id) {
      LOGGER.error("La ressource contient une source sans id.");
      return false;
    } else {
      // On vérifie que l'id n'est pas déjà pris.
      if (this._listOfSourceIds.length !== 0) {

        let present = false;

        for (let i = 0; i < this._listOfSourceIds.length; i++ ) {
          if (this._listOfSourceIds[i] === sourceJsonObject.id) {
            LOGGER.info("La source contenant l'id " + sourceJsonObject.id + " est deja referencee.");
            // On vérifie que la source décrite et celle déjà identifiée soient exactement les mêmes
            if (this.checkDuplicationSource(sourceJsonObject)) {
              present = true;
              break;
            } else {
              LOGGER.error("La source contenant l'id " + sourceJsonObject.id + " n'est pas identique à la source deja identifiee.");
              return false;
            }

          } else {
            // on continue de vérifier
          }
        }

        if (!present) {
          this._listOfSourceIds.push(sourceJsonObject.id);
          this._sourceDescriptions[sourceJsonObject.id] = sourceJsonObject;
        }

      } else {
        // C'est la première source.
        this._listOfSourceIds.push(sourceJsonObject.id);
        this._sourceDescriptions[sourceJsonObject.id] = sourceJsonObject;
      }
    }

    // Type
    if (!sourceJsonObject.type) {
      LOGGER.error("La ressource contient une source sans type.");
      return false;
    } else {
      // Vérification que le type est valide puis vérification spécifique à chaque type
      let available = false;
      // La partie délimitée peut être copié-collée pour ajouter un nouveau type.
      // Il ne reste plus qu'à créer la fonction de vérification correspondante.
      //------ OSRM
      if (sourceJsonObject.type === "osrm") {
        available = true;
        LOGGER.info("Source osrm.");

        // On vérifie que les opérations possibles sur ce type de source soient disponibles dans l'instance du service
        if (!operationManager.isOperationAvailable("route")) {
          LOGGER.error("Le service ne propose pas l'operation 'route', il n'est donc pas possible de charger cette source.");
          return false;
        }
        // On vérifie que les opérations possibles sur ce type de source soient disponibles pour la ressource
        if (!operationManager.isAvailableInTable("route", resourceOperationTable)) {
          LOGGER.error("Le ressource ne propose pas l'operation 'route', il n'est donc pas possible de charger cette source.");
          return false;
        }

        if (!this.checkSourceOsrm(sourceJsonObject)) {
          LOGGER.error("Erreur lors de la verification de la source osrm.");
          return false;
        } else {
          // il n'y a eu aucun problème, la ressource est correctement configurée.
        }
      } else {
        // On va voir si c'est un autre type.
      }
      //------ OSRM
      //------ PGR
      if (sourceJsonObject.type === "pgr") {
        available = true;
        LOGGER.info("Source pgrouting.");

        // On vérifie que les opérations possibles sur ce type de source soient disponibles dans l'instance du service
        if (!operationManager.isOperationAvailable("route")) {
          LOGGER.error("Le service ne propose pas l'operation 'route', il n'est donc pas possible de charger cette source.");
          return false;
        }
        // On vérifie que les opérations possibles sur ce type de source soient disponibles pour la ressource
        if (!operationManager.isAvailableInTable("route", resourceOperationTable)) {
          LOGGER.error("Le ressource ne propose pas l'operation 'route', il n'est donc pas possible de charger cette source.");
          return false;
        }
        
        if (!this.checkSourcePgr(sourceJsonObject)) {
          LOGGER.error("Erreur lors de la verification de la source pgr.");
          return false;
        } else {
          // il n'y a eu aucun problème, la ressource est correctement configurée.
        }
      } else {
        // On va voir si c'est un autre type.
      }
      //------ PGR

      // Si ce n'est aucun type valide, on renvoie une erreur.
      if (!available) {
        LOGGER.error("La source indique un type invalide: " + sourceJsonObject.type);
        return false;
      }
    }

    LOGGER.info("Fin de la verification de la source.");
    return true;

  }

  /**
  *
  * @function
  * @name checkSourceOsrm
  * @description Fonction utilisée pour vérifier le contenu d'un fichier de description d'une source osrm.
  * @param {json} sourceJsonObject - Description JSON de la source
  * @return {boolean} vrai si tout c'est bien passé et faux s'il y a eu une erreur
  *
  */

  checkSourceOsrm(sourceJsonObject) {

    LOGGER.info("Verification de la source osrm...");

    // Storage
    if (!sourceJsonObject.storage) {
      LOGGER.error("La ressource contient une source sans stockage.");
      return false;
    } else {
      if (!storageManager.checkJsonStorage(sourceJsonObject.storage)) {
        LOGGER.error("Stockage de la source incorrect.");
        return false;
      } else {
        // Normalement, il n'y a plus rien à faire car la fonction checkDuplicationSource() vérifie déjà que la source n'est pas dupliquée
      }
    }

    // Cost
    if (!sourceJsonObject.cost) {
      LOGGER.error("La ressource contient une source sans cout.");
      return false;
    } else {
      // Profile
      if (!sourceJsonObject.cost.profile) {
        LOGGER.error("La ressource contient une source sans profile.");
        return false;
      } else {
        // rien à faire
      }
      // Optimization
      if (!sourceJsonObject.cost.optimization) {
        LOGGER.error("La ressource contient une source sans optimization.");
        return false;
      } else {
        // rien à faire
      }
      // Compute
      if (!sourceJsonObject.cost.compute) {
        LOGGER.error("La ressource contient une source sans compute.");
        return false;
      } else {
        if (!sourceJsonObject.cost.compute.storage) {
          LOGGER.error("La ressource contient une source ayant un cout sans stockage.");
          return false;
        } else {
          if (!storageManager.checkJsonStorage(sourceJsonObject.cost.compute.storage)) {
            LOGGER.error("La ressource contient une source ayant un stockage du cout incorrect.");
            return false;
          } else {
            // rien à faire
          }
        }
      }
    }

    LOGGER.info("Fin de la verification de la source osrm.");
    return true;
  }

  /**
  *
  * @function
  * @name checkSourcePgr
  * @description Fonction utilisée pour vérifier le contenu d'un fichier de description d'une source pgr.
  * @param {json} sourceJsonObject - Description JSON de la source
  * @return {boolean} vrai si tout c'est bien passé et faux s'il y a eu une erreur
  *
  */

 checkSourcePgr(sourceJsonObject) {

  LOGGER.info("Verification de la source pgr...");

  // Storage
  if (!sourceJsonObject.storage) {
    LOGGER.error("La ressource contient une source sans stockage.");
    return false;
  } else {
    if (!storageManager.checkJsonStorage(sourceJsonObject.storage)) {
      LOGGER.error("Stockage de la source incorrect.");
      return false;
    } else {
      // Normalement, il n'y a plus rien à faire car la fonction checkDuplicationSource() vérifie déjà que la source n'est pas dupliquée
    }
  }

  // Cost
  if (!sourceJsonObject.cost) {
    LOGGER.error("La ressource contient une source sans cout.");
    return false;
  } else {
    // Profile
    if (!sourceJsonObject.cost.profile) {
      LOGGER.error("La ressource contient une source sans profile.");
      return false;
    } else {
      // rien à faire
    }
    // Optimization
    if (!sourceJsonObject.cost.optimization) {
      LOGGER.error("La ressource contient une source sans optimization.");
      return false;
    } else {
      // rien à faire
    }
    // Compute
    if (!sourceJsonObject.cost.compute) {
      LOGGER.error("La ressource contient une source sans compute.");
      return false;
    } else {
      if (!sourceJsonObject.cost.compute.storage) {
        LOGGER.error("La ressource contient une source ayant un cout sans stockage.");
        return false;
      } else {
        if (!storageManager.checkJsonStorage(sourceJsonObject.cost.compute.storage)) {
          LOGGER.error("La ressource contient une source ayant un stockage du cout incorrect.");
          return false;
        } else {
          // rien à faire
        }
      }
    }
  }

  LOGGER.info("Fin de la verification de la source pgr.");
  return true;
}

  /**
  *
  * @function
  * @name checkDuplicationSource
  * @description Fonction utilisée pour vérifier que le contenu d'un fichier de description d'une source est bien le même qu'un autre.
  * @param {json} sourceJsonObject - Description JSON de la source
  * @return {boolean} vrai si tout c'est bien passé et faux s'il y a eu une erreur
  *
  */

  checkDuplicationSource(sourceJsonObject) {

    LOGGER.info("Comparaison des deux sources identifiees et devant etre identiques...");

    // On récupère la description de la source faisant office de référence car lue la première.
    let referenceSource = this._sourceDescriptions[sourceJsonObject.id];

    // On compare les deux objets
    try {
      assert.deepStrictEqual(sourceJsonObject, referenceSource);
    } catch (err) {
      LOGGER.error("Les deux sources ne sont pas identiques.");
      LOGGER.debug(err);
      return false;
    }

    LOGGER.info("Les deux sources sont identiques.");
    return true;

  }

  /**
  *
  * @function
  * @name createSource
  * @description Fonction utilisée pour créer une source.
  * @param {json} sourceJsonObject - Description JSON de la source
  * @return {Source} Source créée
  *
  */

  createSource(sourceJsonObject) {

    LOGGER.info("Creation de la source: " + sourceJsonObject.id);

    let source;

    if (sourceJsonObject.type === "osrm") {
      source = new osrmSource(sourceJsonObject);
    } else if (sourceJsonObject.type === "pgr") {
      source = new pgrSource(sourceJsonObject);
    } else {
      // On va voir si c'est un autre type.
    }
    return source;
  }

  /**
  *
  * @function
  * @name connectSource
  * @description Fonction utilisée pour connecter une source.
  * @param {Source} source - Objet Source ou hérité de la classe Source
  * @return {boolean} vrai si tout c'est bien passé et faux s'il y a eu une erreur
  *
  */
  async connectSource(source) {

    LOGGER.info("Connexion a la source: " + source.id);
    try {
      const connected = await source.connect();
      if (connected) {
        LOGGER.info("Source connectee.");
        return true;
      } else {
        LOGGER.error("Impossible de connecter la source.");
        return false;
      }
    } catch (err) {
      LOGGER.error("Impossible de connecter la source.", err);
      return false;
    }
  }

  /**
  *
  * @function
  * @name disconnectSource
  * @description Fonction utilisée pour déconnecter une source.
  * @param {Source} source - Objet Source ou hérité de la classe Source
  * @return {boolean} vrai si tout c'est bien passé et faux s'il y a eu une erreur
  *
  */
  async disconnectSource(source) {
    LOGGER.info("Déconnection de la source: " + source.id);
    try {
      const disconnected = await source.disconnect();
      if (disconnected) {
        LOGGER.info("Source déconnectee.");
        return true;
      } else {
        LOGGER.error("Impossible de déconnecter la source.");
        return false;
      }
    } catch (err) {
      LOGGER.error("Impossible de déconnecter la source.", err);
      return false;
    }
  }

}
