-- Accounts, care profiles and the care circle.

create table app_user (
	id uuid primary key,
	email varchar(254) not null unique,
	password_hash varchar(100) not null,
	display_name varchar(100) not null,
	created_at timestamp with time zone not null
);

create table patient (
	id uuid primary key,
	name varchar(100) not null,
	birth_year integer,
	notes varchar(1000),
	grace_minutes integer not null,
	created_at timestamp with time zone not null
);

create table care_member (
	id uuid primary key,
	patient_id uuid not null references patient (id) on delete cascade,
	user_id uuid not null references app_user (id) on delete cascade,
	role varchar(20) not null,
	relation varchar(60),
	created_at timestamp with time zone not null,
	unique (patient_id, user_id)
);

-- Treatment courses decomposed into a daily schedule.

create table course (
	id uuid primary key,
	patient_id uuid not null references patient (id) on delete cascade,
	title varchar(200) not null,
	start_date date not null,
	source varchar(200),
	active boolean not null,
	created_by uuid references app_user (id) on delete set null,
	created_at timestamp with time zone not null,
	ended_on date
);
create index course_patient_idx on course (patient_id);

create table course_med (
	id uuid primary key,
	course_id uuid not null references course (id) on delete cascade,
	position integer not null,
	name varchar(100) not null,
	strength varchar(50) not null,
	form varchar(30) not null,
	unit varchar(20) not null,
	dose numeric(8, 2) not null,
	times varchar(60) not null,
	days integer not null,
	note varchar(200)
);
create index course_med_course_idx on course_med (course_id);

-- Virtual medicine cabinet.

create table drug_catalog (
	gtin varchar(14) primary key,
	name varchar(100) not null,
	strength varchar(50) not null,
	form varchar(30) not null,
	unit varchar(20) not null,
	pack_size integer,
	manufacturer varchar(200)
);

create table stock_item (
	id uuid primary key,
	patient_id uuid not null references patient (id) on delete cascade,
	name varchar(100) not null,
	strength varchar(50) not null,
	form varchar(30) not null,
	unit varchar(20) not null,
	qty numeric(10, 2) not null,
	pack_size integer,
	expiry date,
	gtin varchar(14),
	updated_at timestamp with time zone not null
);
create index stock_item_patient_idx on stock_item (patient_id);

create table dose_log (
	id uuid primary key,
	course_med_id uuid not null references course_med (id) on delete cascade,
	dose_date date not null,
	dose_time varchar(5) not null,
	status varchar(10) not null,
	note varchar(200),
	marked_by uuid references app_user (id) on delete set null,
	marked_by_role varchar(20) not null,
	marked_at timestamp with time zone not null,
	stock_item_id uuid references stock_item (id) on delete set null,
	consumed numeric(8, 2) not null,
	unique (course_med_id, dose_date, dose_time)
);

-- Health diary, thresholds and requests for help.

create table vital_reading (
	id uuid primary key,
	patient_id uuid not null references patient (id) on delete cascade,
	type varchar(20) not null,
	value1 numeric(6, 1) not null,
	value2 numeric(6, 1),
	measured_at timestamp with time zone not null,
	recorded_by uuid references app_user (id) on delete set null,
	note varchar(200)
);
create index vital_reading_patient_idx on vital_reading (patient_id, measured_at);

create table vital_threshold (
	id uuid primary key,
	patient_id uuid not null references patient (id) on delete cascade,
	type varchar(20) not null,
	min1 numeric(6, 1),
	max1 numeric(6, 1),
	min2 numeric(6, 1),
	max2 numeric(6, 1),
	unique (patient_id, type)
);

create table help_request (
	id uuid primary key,
	patient_id uuid not null references patient (id) on delete cascade,
	created_by uuid references app_user (id) on delete set null,
	created_at timestamp with time zone not null,
	message varchar(300),
	resolved_at timestamp with time zone,
	resolved_by uuid references app_user (id) on delete set null
);
create index help_request_patient_idx on help_request (patient_id);
