# Bitespeed Backend Task: Identity Reconciliation

## Problem Statement

The goal is to create an identity reconciliation service for contact data. Given a set of contact information (email and phone number), the service needs to identify if the contact already exists in the database and link it appropriately. Contacts should be classified as either **primary** or **secondary**, and any new contact information should be reconciled with existing records to maintain a unified view of each contact.

## Solution Overview

The service is built using Node.js with Express and Sequelize to handle database operations with a PostgreSQL database. The reconciliation process follows these steps:

1. **Receive Request**: Accept a POST request with `email` and `phoneNumber`.
2. **Lookup**: Query the database for contacts matching the provided email or phone number.
3. **Primary Contact**:

   * If no matches are found, create a new primary contact record.
   * If matches exist, select the earliest-created record as the primary.
4. **Link Secondaries**: Associate any remaining matches as secondary contacts under the primary record.
5. **Unified Response**: Return a consolidated contact object with all associated emails, phone numbers, and secondary contact IDs.

## Technologies Used

* **Node.js**: JavaScript runtime powering the service logic.
* **Express**: Framework for defining RESTful API routes and middleware.
* **Sequelize**: ORM for modeling and querying the PostgreSQL database.
* **PostgreSQL**: Relational database for persisting contact data.
* **dotenv**: Manages environment variables securely.
* **Body-Parser**: Parses incoming JSON request bodies.

## Endpoints

### POST `/identify`

**Request Body**:

```json
{
  "email": "user@example.com",
  "phoneNumber": "1234567890"
}
```

**Response** (200 OK):

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["user@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

## Hosted URL

Access the running service at:

```
https://bitespeed-backend-task-qoax.onrender.com
```

---

*Repository:* [https://github.com/RATIKANTA1/bitespeed-backend-task](https://github.com/RATIKANTA1/bitespeed-backend-task)
