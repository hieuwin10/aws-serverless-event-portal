Table EventManagementTable {
  PK string [pk]
  SK string [pk]

  entityType string

  createdAt string
  updatedAt string

  ttl number

  GSI1PK string
  GSI1SK string

  GSI2PK string
  GSI2SK string

  data json
}

//////////////////////////////////////////////////////
// USER
//////////////////////////////////////////////////////

Table USER {
  PK string [note: 'USER#<UserId>']
  SK string [note: 'METADATA']

  entityType string [note: 'USER']

  userId string
  fullName string
  email string
  phone string

  role string
  avatarUrl string

  createdAt string
  updatedAt string
}

//////////////////////////////////////////////////////
// EVENT
//////////////////////////////////////////////////////

Table EVENT {
  PK string [note: 'EVENT#<EventId>']
  SK string [note: 'METADATA']

  entityType string [note: 'EVENT']

  eventId string
  organizerId string

  categoryId string
  locationId string

  title string
  description text

  startTime string
  endTime string

  remainingSeats number
  totalSeats number

  status string

  GSI1PK string [note: 'CAT#<CategoryId>']
  GSI1SK string [note: 'START#<Time>#EVENT#<Id>']

  createdAt string
  updatedAt string
}

//////////////////////////////////////////////////////
// REGISTRATION (AGGREGATE ROOT)
//////////////////////////////////////////////////////

Table REGISTRATION {
  PK string [note: 'USER#<UserId>']
  SK string [note: 'EVENT#<EventId>']

  entityType string [note: 'REGISTRATION']

  registrationId string

  userId string
  eventId string

  ticketId string

  requestId string [note: 'Idempotency Key']

  status string

  paymentState string

  registeredAt string

  GSI2PK string [note: 'EVENT#<EventId>']
  GSI2SK string [note: 'USER#<UserId>']

  createdAt string
  updatedAt string
}

//////////////////////////////////////////////////////
// PAYMENT
//////////////////////////////////////////////////////

Table PAYMENT {
  PK string [note: 'REG#<RegistrationId>']
  SK string [note: 'PAYMENT#<PaymentId>']

  entityType string [note: 'PAYMENT']

  paymentId string
  registrationId string

  userId string

  paymentIntentId string

  amount number
  currency string

  provider string

  state string [note: 'PENDING/PROCESSING/SUCCESS/FAILED']

  transactionId string

  GSI2PK string [note: 'USER#<UserId>']
  GSI2SK string [note: 'TXN#<TransactionId>']

  createdAt string
  updatedAt string
}

//////////////////////////////////////////////////////
// CHECKIN
//////////////////////////////////////////////////////

Table CHECKIN {
  PK string [note: 'REG#<RegistrationId>']
  SK string [note: 'CHECKIN#<Timestamp>']

  entityType string [note: 'CHECKIN']

  checkinId string

  registrationId string
  checkedInAt string

  deviceId string

  createdAt string
}

//////////////////////////////////////////////////////
// CATEGORY
//////////////////////////////////////////////////////

Table CATEGORY {
  PK string [note: 'CAT#<CategoryId>']
  SK string [note: 'METADATA']

  entityType string [note: 'CATEGORY']

  categoryId string
  categoryName string

  description text

  createdAt string
}

//////////////////////////////////////////////////////
// LOCATION
//////////////////////////////////////////////////////

Table LOCATION {
  PK string [note: 'LOC#<LocationId>']
  SK string [note: 'METADATA']

  entityType string [note: 'LOCATION']

  locationId string

  venueName string
  address text

  city string
  country string

  createdAt string
}

//////////////////////////////////////////////////////
// ORGANIZER
//////////////////////////////////////////////////////

Table ORGANIZER {
  PK string [note: 'ORG#<OrganizerId>']
  SK string [note: 'METADATA']

  entityType string [note: 'ORGANIZER']

  organizerId string

  organizerName string
  contactEmail string

  website string

  createdAt string
}

//////////////////////////////////////////////////////
// SPEAKER
//////////////////////////////////////////////////////

Table SPEAKER {
  PK string [note: 'SPEAKER#<SpeakerId>']
  SK string [note: 'METADATA']

  entityType string [note: 'SPEAKER']

  speakerId string

  fullName string
  bio text

  company string
  avatarUrl string

  createdAt string
}

//////////////////////////////////////////////////////
// EVENT_SPEAKER (M-N)
//////////////////////////////////////////////////////

Table EVENT_SPEAKER {
  PK string [note: 'EVENT#<EventId>']
  SK string [note: 'SPEAKER#<SpeakerId>']

  entityType string [note: 'EVENT_SPEAKER']

  eventId string
  speakerId string

  sessionTitle string
  sessionTime string

  GSI1PK string [note: 'SPEAKER#<SpeakerId>']
  GSI1SK string [note: 'EVENT#<EventId>']

  createdAt string
}

//////////////////////////////////////////////////////
// SPONSOR
//////////////////////////////////////////////////////

Table SPONSOR {
  PK string [note: 'SPONSOR#<SponsorId>']
  SK string [note: 'METADATA']

  entityType string [note: 'SPONSOR']

  sponsorId string

  sponsorName string
  website string

  tier string

  createdAt string
}

//////////////////////////////////////////////////////
// EVENT_SPONSOR (M-N)
//////////////////////////////////////////////////////

Table EVENT_SPONSOR {
  PK string [note: 'EVENT#<EventId>']
  SK string [note: 'SPONSOR#<SponsorId>']

  entityType string [note: 'EVENT_SPONSOR']

  eventId string
  sponsorId string

  contractValue number

  GSI1PK string [note: 'SPONSOR#<SponsorId>']
  GSI1SK string [note: 'EVENT#<EventId>']

  createdAt string
}

//////////////////////////////////////////////////////
// TICKET
//////////////////////////////////////////////////////

Table TICKET {
  PK string [note: 'EVENT#<EventId>']
  SK string [note: 'TICKET#<TicketId>']

  entityType string [note: 'TICKET']

  ticketId string
  eventId string

  ticketName string

  price number
  currency string

  totalQuantity number
  remainingQuantity number

  salesStart string
  salesEnd string

  createdAt string
  updatedAt string
}

//////////////////////////////////////////////////////
// FEEDBACK
//////////////////////////////////////////////////////

Table FEEDBACK {
  PK string [note: 'EVENT#<EventId>']
  SK string [note: 'FEEDBACK#<UserId>']

  entityType string [note: 'FEEDBACK']

  feedbackId string

  eventId string
  userId string

  rating number
  comment text

  createdAt string
}

//////////////////////////////////////////////////////
// NOTIFICATION
//////////////////////////////////////////////////////

Table NOTIFICATION {
  PK string [note: 'USER#<UserId>']
  SK string [note: 'NOTIF#<NotifId>']

  entityType string [note: 'NOTIF']

  notificationId string

  title string
  content text

  isRead boolean

  ttl number [note: '30 days']

  createdAt string
}

//////////////////////////////////////////////////////
// AUDIT LOG
//////////////////////////////////////////////////////

Table AUDIT_LOG {
  PK string [note: 'LOG#<Component>']
  SK string [note: 'TIME#<Epoch>']

  entityType string [note: 'OP_LOG']

  logId string

  component string
  action string

  userId string

  metadata json

  ttl number [note: '7 days']

  createdAt string
}

//////////////////////////////////////////////////////
// MATERIALIZED VIEW CACHE
//////////////////////////////////////////////////////

Table MATERIALIZED_VIEW {
  PK string [note: 'CACHE#HOMEPAGE']
  SK string [note: 'TRENDING_EVENTS']

  entityType string [note: 'MATERIALIZED_VIEW']

  cacheVersion number

  payload json

  ttl number [note: '60 seconds']

  updatedAt string
}
//////////////////////////////////////////////////////
// RELATIONSHIPS
//////////////////////////////////////////////////////

Ref: EVENT.eventId > ORGANIZER.organizerId
Ref: EVENT.categoryId > CATEGORY.categoryId
Ref: EVENT.locationId > LOCATION.locationId

Ref: REGISTRATION.userId > USER.userId
Ref: REGISTRATION.eventId > EVENT.eventId
Ref: REGISTRATION.ticketId > TICKET.ticketId

Ref: PAYMENT.registrationId > REGISTRATION.registrationId
Ref: PAYMENT.userId > USER.userId

Ref: CHECKIN.registrationId > REGISTRATION.registrationId

Ref: EVENT_SPEAKER.eventId > EVENT.eventId
Ref: EVENT_SPEAKER.speakerId > SPEAKER.speakerId

Ref: EVENT_SPONSOR.eventId > EVENT.eventId
Ref: EVENT_SPONSOR.sponsorId > SPONSOR.sponsorId

Ref: FEEDBACK.userId > USER.userId
Ref: FEEDBACK.eventId > EVENT.eventId