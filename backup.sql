--
-- PostgreSQL database dump
--

\restrict vFD1OYJE2tS9bJ8QBvQkRbXcx8rQbmGDgNqht08uilGlhMv0Neb7PjAkSAbpXA7

-- Dumped from database version 16.12 (6d3029c)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.admin_sessions (
    id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_sessions OWNER TO neondb_owner;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.admin_users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text NOT NULL,
    first_name character varying(50),
    last_name character varying(50),
    role character varying(20) DEFAULT 'standard'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_users OWNER TO neondb_owner;

--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.admin_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_users_id_seq OWNER TO neondb_owner;

--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: custom_quote_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_quote_requests (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    phone character varying(20) NOT NULL,
    company character varying(200),
    city character varying(100) NOT NULL,
    state character varying(2) NOT NULL,
    zip_code character varying(10) NOT NULL,
    requirements text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.custom_quote_requests OWNER TO neondb_owner;

--
-- Name: custom_quote_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.custom_quote_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_quote_requests_id_seq OWNER TO neondb_owner;

--
-- Name: custom_quote_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.custom_quote_requests_id_seq OWNED BY public.custom_quote_requests.id;


--
-- Name: dealer_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealer_orders (
    id integer NOT NULL,
    dealer_id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_name character varying(200),
    customer_email character varying(200),
    customer_phone character varying(20),
    category_slug text NOT NULL,
    category_name text NOT NULL,
    model_id text NOT NULL,
    model_name text NOT NULL,
    model_specs json NOT NULL,
    selected_options json NOT NULL,
    base_price integer NOT NULL,
    options_price integer NOT NULL,
    total_price integer NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dealer_orders OWNER TO neondb_owner;

--
-- Name: dealer_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.dealer_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dealer_orders_id_seq OWNER TO neondb_owner;

--
-- Name: dealer_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.dealer_orders_id_seq OWNED BY public.dealer_orders.id;


--
-- Name: dealer_password_reset_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealer_password_reset_tokens (
    id integer NOT NULL,
    dealer_id integer NOT NULL,
    token character varying(255) NOT NULL,
    email character varying(200) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.dealer_password_reset_tokens OWNER TO neondb_owner;

--
-- Name: dealer_password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.dealer_password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dealer_password_reset_tokens_id_seq OWNER TO neondb_owner;

--
-- Name: dealer_password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.dealer_password_reset_tokens_id_seq OWNED BY public.dealer_password_reset_tokens.id;


--
-- Name: dealer_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealer_sessions (
    id character varying(255) NOT NULL,
    dealer_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dealer_sessions OWNER TO neondb_owner;

--
-- Name: dealer_user_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealer_user_sessions (
    id character varying(255) NOT NULL,
    user_id integer NOT NULL,
    dealer_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dealer_user_sessions OWNER TO neondb_owner;

--
-- Name: dealer_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealer_users (
    id integer NOT NULL,
    dealer_id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    title character varying(100),
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    reset_token text,
    reset_token_expiry timestamp without time zone
);


ALTER TABLE public.dealer_users OWNER TO neondb_owner;

--
-- Name: dealer_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.dealer_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dealer_users_id_seq OWNER TO neondb_owner;

--
-- Name: dealer_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.dealer_users_id_seq OWNED BY public.dealer_users.id;


--
-- Name: dealers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dealers (
    id integer NOT NULL,
    dealer_id character varying(50) NOT NULL,
    dealer_name character varying(200) NOT NULL,
    contact_name character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    phone character varying(20) NOT NULL,
    territory character varying(100),
    address text,
    city character varying(100),
    state character varying(2),
    zip_code character varying(10),
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    company_name character varying(200),
    website character varying(200),
    contact_first_name character varying(100),
    contact_last_name character varying(100),
    contact_email character varying(200),
    contact_title character varying(100)
);


ALTER TABLE public.dealers OWNER TO neondb_owner;

--
-- Name: dealers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.dealers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dealers_id_seq OWNER TO neondb_owner;

--
-- Name: dealers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.dealers_id_seq OWNED BY public.dealers.id;


--
-- Name: media_files; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.media_files (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    object_path text NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    width integer,
    height integer,
    alt_text text,
    description text,
    tags jsonb DEFAULT '[]'::jsonb,
    uploaded_by integer,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.media_files OWNER TO neondb_owner;

--
-- Name: media_files_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.media_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.media_files_id_seq OWNER TO neondb_owner;

--
-- Name: media_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.media_files_id_seq OWNED BY public.media_files.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    email character varying(100) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO neondb_owner;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO neondb_owner;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: quote_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.quote_requests (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    zip_code character varying(10) NOT NULL,
    mobile character varying(20) NOT NULL,
    email character varying(200) NOT NULL,
    company character varying(200),
    comments text,
    opt_in boolean DEFAULT false NOT NULL,
    age_verification boolean DEFAULT false NOT NULL,
    category_id integer,
    category_name character varying(100),
    model_id character varying(50),
    model_name character varying(200),
    selected_options json,
    total_price integer,
    trailer_specs json,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.quote_requests OWNER TO neondb_owner;

--
-- Name: quote_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.quote_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_requests_id_seq OWNER TO neondb_owner;

--
-- Name: quote_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.quote_requests_id_seq OWNED BY public.quote_requests.id;


--
-- Name: trailer_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trailer_categories (
    id integer NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    image_url text NOT NULL,
    starting_price integer NOT NULL,
    is_archived boolean NOT NULL,
    order_index integer DEFAULT 0
);


ALTER TABLE public.trailer_categories OWNER TO neondb_owner;

--
-- Name: trailer_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.trailer_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trailer_categories_id_seq OWNER TO neondb_owner;

--
-- Name: trailer_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.trailer_categories_id_seq OWNED BY public.trailer_categories.id;


--
-- Name: trailer_lengths; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trailer_lengths (
    id integer NOT NULL,
    model_id integer DEFAULT 0 NOT NULL,
    length integer DEFAULT 0 NOT NULL,
    pull_type text DEFAULT ''::text NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.trailer_lengths OWNER TO neondb_owner;

--
-- Name: trailer_models; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trailer_models (
    id integer NOT NULL,
    category_id integer NOT NULL,
    model_id text NOT NULL,
    name text NOT NULL,
    "(old)" text,
    axles text,
    base_price integer,
    image_url text,
    features text,
    is_archived boolean DEFAULT false,
    category_sub_type text,
    series_id integer,
    model_series text,
    length_options json,
    length_price json,
    pulltype_options json,
    length_gvwr json,
    length_payload json,
    deck_size json,
    length_order jsonb,
    model_3d_url text,
    category_order jsonb,
    image_urls jsonb
);


ALTER TABLE public.trailer_models OWNER TO neondb_owner;

--
-- Name: trailer_models_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.trailer_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trailer_models_id_seq OWNER TO neondb_owner;

--
-- Name: trailer_models_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.trailer_models_id_seq OWNED BY public.trailer_models.id;


--
-- Name: trailer_option_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trailer_option_categories (
    id integer NOT NULL,
    "Name" text,
    "position" integer,
    is_system boolean DEFAULT false
);


ALTER TABLE public.trailer_option_categories OWNER TO neondb_owner;

--
-- Name: trailer_option_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

ALTER TABLE public.trailer_option_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.trailer_option_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: trailer_options; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trailer_options (
    id integer NOT NULL,
    model_id text NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    is_multi_select boolean DEFAULT false,
    is_archived boolean,
    image_url text,
    option_category text,
    payload integer,
    applicable_models jsonb,
    hex_color text,
    primer_price integer,
    is_default boolean DEFAULT false,
    is_per_ft boolean DEFAULT false
);


ALTER TABLE public.trailer_options OWNER TO neondb_owner;

--
-- Name: trailer_options_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.trailer_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trailer_options_id_seq OWNER TO neondb_owner;

--
-- Name: trailer_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.trailer_options_id_seq OWNED BY public.trailer_options.id;


--
-- Name: trailer_series; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.trailer_series (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    slug text NOT NULL,
    base_price integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    is_archived boolean,
    image_url text
);


ALTER TABLE public.trailer_series OWNER TO neondb_owner;

--
-- Name: trailer_series_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.trailer_series_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trailer_series_id_seq OWNER TO neondb_owner;

--
-- Name: trailer_series_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.trailer_series_id_seq OWNED BY public.trailer_series.id;


--
-- Name: user_configurations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_configurations (
    id integer NOT NULL,
    session_id text NOT NULL,
    category_slug text NOT NULL,
    model_id text NOT NULL,
    selected_options json NOT NULL,
    total_price integer NOT NULL,
    created_at text NOT NULL
);


ALTER TABLE public.user_configurations OWNER TO neondb_owner;

--
-- Name: user_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_configurations_id_seq OWNER TO neondb_owner;

--
-- Name: user_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_configurations_id_seq OWNED BY public.user_configurations.id;


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: custom_quote_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_quote_requests ALTER COLUMN id SET DEFAULT nextval('public.custom_quote_requests_id_seq'::regclass);


--
-- Name: dealer_orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_orders ALTER COLUMN id SET DEFAULT nextval('public.dealer_orders_id_seq'::regclass);


--
-- Name: dealer_password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.dealer_password_reset_tokens_id_seq'::regclass);


--
-- Name: dealer_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_users ALTER COLUMN id SET DEFAULT nextval('public.dealer_users_id_seq'::regclass);


--
-- Name: dealers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealers ALTER COLUMN id SET DEFAULT nextval('public.dealers_id_seq'::regclass);


--
-- Name: media_files id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.media_files ALTER COLUMN id SET DEFAULT nextval('public.media_files_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: quote_requests id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quote_requests ALTER COLUMN id SET DEFAULT nextval('public.quote_requests_id_seq'::regclass);


--
-- Name: trailer_categories id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_categories ALTER COLUMN id SET DEFAULT nextval('public.trailer_categories_id_seq'::regclass);


--
-- Name: trailer_models id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_models ALTER COLUMN id SET DEFAULT nextval('public.trailer_models_id_seq'::regclass);


--
-- Name: trailer_options id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_options ALTER COLUMN id SET DEFAULT nextval('public.trailer_options_id_seq'::regclass);


--
-- Name: trailer_series id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_series ALTER COLUMN id SET DEFAULT nextval('public.trailer_series_id_seq'::regclass);


--
-- Name: user_configurations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_configurations ALTER COLUMN id SET DEFAULT nextval('public.user_configurations_id_seq'::regclass);


--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_sessions (id, user_id, expires_at, created_at) FROM stdin;
e60e188b8580dbf20ef385cfe3058588f38e2d49ad3ca729ccd8cf82cb9d8c66	1	2025-07-31 02:49:17.11	2025-07-30 02:49:17.146849
0221cf8bc395fb18c023aa2ce2270811261d801eea5666a347c67f86ab1efac5	1	2025-09-30 13:49:57.825	2025-09-29 13:49:57.996093
3e0226dc92f8abcbab0bfdc85e3dd31e05bb57cc2a997fb18159d91b2796f809	3	2025-07-31 02:51:11.224	2025-07-30 02:51:11.259108
7e78a62a1206c8367a8479641c1b3086c804972ef7b5fdf56fdcbb9fbc9b79f9	1	2025-09-30 13:51:27.547	2025-09-29 13:51:27.722013
9200243913faed78f9adebb44255eb2754db2ec4b96c10ae4539de87384a84f1	1	2025-08-17 02:58:36.584	2025-08-16 02:58:36.762226
592ad8e188cd4fa11a8920b1e4cc63cd4fe63f6179ed7b9f8993519fda015882	1	2025-08-23 16:46:52.313	2025-08-22 16:46:52.48247
49be8f35dbcd78438610bb2e9d0d291f54e004873e0b0ee8a075e0c92022db1e	3	2025-08-23 20:59:56.552	2025-08-22 20:59:56.723456
15259dc6b309f920fb1b95635b35c9a37ef03098323c49f8ee1fbe038a68fc12	1	2025-08-23 21:35:38.114	2025-08-22 21:35:38.298077
c63965f9a4af4247375bc06ecd398fe4c4a366d6b93a22ec4ada862c2d828f87	1	2025-10-02 03:28:34.188	2025-10-01 03:28:34.354564
8b566c470cc10a3f238228ea2e3798943d92fce31a4295a12c321b6ca512617e	1	2025-10-02 20:41:49.862	2025-10-01 20:41:50.031702
84c894aa97115ea00344add061c1f0397798bf5dcb7a7d59c030b67877ec85ab	1	2025-08-26 22:06:39.688	2025-08-25 22:06:39.863639
d99b58ed089d7a538a0c874c35531623b42be7048d6311a344c7f8044efaf08e	8	2026-02-07 14:58:08.28	2026-02-06 14:58:08.363095
2a382e63c26895bfd179a084c5fcea25664bab666980df0d956eb06008b9879c	1	2025-09-04 19:03:37.064	2025-09-03 19:03:37.243808
5109e3109416ef819ce0296a6d2162436e3d4e4953d6d181d4fe1c01cc69628d	1	2025-09-04 20:50:46.855	2025-09-03 20:50:47.021472
c8122436677b4a285cbd41d03c66f8ca5c02e0517d3fcbb4ce80060ce691cd6b	5	2026-02-24 17:26:13.741	2026-02-23 17:26:13.842588
ed8123fc7af8c6bfa489c76b9b3f6893555c9f4dee7d9ea85d35d2ff9f8ea868	1	2025-09-12 20:13:17.005	2025-09-11 20:13:17.174433
d211befda43fdd30b0a885ecae439b8651b87f9eb11960414df0e78d0dba2b73	1	2026-02-25 03:12:53.787	2026-02-24 03:12:53.983316
ebcb08d6737eb7ab8a3578df09dda01459c044dc3f191a011d9681b9d16e44ca	1	2026-02-25 03:15:08.046	2026-02-24 03:15:08.198612
881fff59f62f646e6db8406813ab7995548c04b4a5cd5f5cb063899d00a4b570	1	2026-03-02 21:43:05.373	2026-03-01 21:43:05.540638
9a4e920c6dc2e224376999ac0bc3f28f11bf2281a0e024f472b901ef4a771861	5	2026-03-03 19:25:08.215	2026-03-02 19:25:08.232677
9370f4c2d08b34edb82c2e26998dba964c1c576082f9324068bd268bd9197c1d	1	2026-03-04 17:43:55.729	2026-03-03 17:43:55.832075
b03f661c195cf66dd262e79918ca1387ce1c1be863e5a126a24e2e287303de6d	1	2025-09-19 19:41:27.041	2025-09-18 19:41:27.219193
04add9d44209f355bee45108ef3b5d216d9ca4b5ab02f4ea1072b25c1539d975	1	2025-09-20 13:41:06.854	2025-09-19 13:41:07.026179
176326cac3de881b35bd1458ac98b602b1f1b1d1b874f308c568043ec82e322d	1	2026-03-09 19:52:55.658	2026-03-08 19:52:55.832394
70af0c0a4426cb221db80fa8eef951650cc7604eead2566700ed946ec031ba60	1	2025-09-20 19:11:22.057	2025-09-19 19:11:22.221129
ec378523da65c2672e74faf1d84fc10506fee4f2e6f6c6746b386e9497976bf7	1	2025-09-20 19:35:39.67	2025-09-19 19:35:39.835153
0b1d1a7abe5a8d2148ae2543c8b072cbfcb60b84fc1373113f6df4f80611711a	1	2025-09-21 04:00:28.554	2025-09-20 04:00:28.728988
9b37614b407afc834025b1a2df08b1bd737119e1fc6b859c0c7c10c0dd681c3e	1	2025-09-24 18:35:00.994	2025-09-23 18:35:01.160446
3c82a9f863bb67662c26bfac5b3aed620a2280e87e35001d7e1609310667e37c	1	2025-09-26 18:58:12.733	2025-09-25 18:58:12.904146
c869ca52cc033b0197995b7a420786b58a2713192455316478fbbec63020b75d	1	2025-09-27 13:32:01.809	2025-09-26 13:32:01.973922
a0c18483798fcb2db055540251895cd67b785911337e5587cb3b9e289fab6461	1	2025-09-27 15:28:04.495	2025-09-26 15:28:04.510994
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.admin_users (id, username, email, password_hash, first_name, last_name, role, is_active, last_login, created_at, updated_at) FROM stdin;
8	jordanwilliams	jordan@waltontrailers.com	$2b$12$ATjIFt.XSbzO8qpTeDzgCuPh6bLuzM83jql95WhEIE7KAfyGMHHp.	Jordan	Williams	admin	t	2026-02-06 14:58:08.241	2025-09-29 17:55:00.814063	2026-02-06 14:58:08.242
9	gavinbrush	purchasing@waltontrailers.com	$2b$12$GkPDh2IVf3UHhLDfg8tLYObV3wJYe7Mz35Wwv0XoWyYnkUT5yI/t.	Gavin	Brush	admin	t	2025-09-29 19:01:50.356	2025-09-29 17:59:44.939922	2025-09-29 19:01:50.356
5	taylornielsen	taylor@waltontrailers.com	$2b$12$8vJ5NXCPjbksrt7Ks7dIze3u7TYbHzzty8u2QGZUz4i0bwvTcN7/a	Taylor	Nielsen	admin	t	2026-03-02 19:25:08.18	2025-08-22 22:50:36.329634	2026-03-02 19:25:08.181
1	Stuart D	stuart@relloagency.com	$2b$10$NDhNMbwnRlQpgnUhxSd/meFAbR5KKxHaaLNLBicuKr0N1v0to4RqC	Stuart	Derman	admin	t	2026-03-08 19:52:55.594	2025-07-30 02:46:12.126717	2026-03-08 19:52:55.594
2	employee	employee@waltontrailers.com	$2b$12$LpwqWwV04mO7Iv/mLSF6o.vyrQD2Xq6ofQvepDwShk6g7DYYXZpKS	Standard	Employee	standard	f	2025-08-22 15:52:38.06	2025-07-30 02:46:12.56326	2025-10-01 03:12:31.574
3	rello	digital@relloagency.com	$2b$12$BYBV7AGwuOSGs55cTZD2te4fS8XY9.rHU2xaVGSXiHqkdSnPFcPjm	RELLO	Team	admin	t	2025-08-22 20:59:56.478	2025-07-30 02:51:00.89734	2025-10-01 03:17:37.557
\.


--
-- Data for Name: custom_quote_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.custom_quote_requests (id, first_name, last_name, email, phone, company, city, state, zip_code, requirements, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: dealer_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealer_orders (id, dealer_id, order_number, customer_name, customer_email, customer_phone, category_slug, category_name, model_id, model_name, model_specs, selected_options, base_price, options_price, total_price, status, notes, created_at, updated_at) FROM stdin;
6	1	WT-MEELV4QT-8N7X7	Test Customer After Fix	test@example.com	555-1234	gooseneck	Gooseneck Trailers	FBH207	FBH207 Test	{"gvwr":"15,500lbs"}	{"extras":[32]}	10000	500	10500	draft	Testing after session fix	2025-08-16 18:43:33.738748	2025-08-16 18:43:33.738748
15	3	WT-MG6WRJC7-K8D42	\N	\N	\N	flatbed	Gooseneck Trailers	FBH208	FBH208 - Gooseneck Deckover 16K	{"gvwr":"18,000 lbs ","payload":"13,432 ","deckSize":"96.5” x 20’","axles":"Dual 8K"}	{"Color":139,"extras":[70,73],"jack":66,"ramps":28,"tires":148,"length":"length_FBH208_0"}	14782	1725	16507	draft	\N	2025-09-30 18:45:57.066744	2025-09-30 18:45:57.066744
\.


--
-- Data for Name: dealer_password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealer_password_reset_tokens (id, dealer_id, token, email, expires_at, is_used, created_at) FROM stdin;
5	3	0f0135face08ad8c7f41cf1e2f60e9f677e0f78b50afa0678fe296f1c32b0992	bryan@relloagency.com	2025-09-19 15:51:14	f	2025-09-19 13:51:14.183997
6	3	c280ffaf6dc9903458357c87a600caf096434957cf188bdfeec3f992ea1cc093	bryan@relloagency.com	2025-09-19 15:59:14.121	t	2025-09-19 13:59:14.301209
7	3	dff1cc302cba9f128d4215a493020d68688fa1a388a510b4408b597d79164950	bryan@relloagency.com	2025-09-19 21:08:58.203	f	2025-09-19 19:08:58.38068
8	3	deec9aeeba1f15b0961f0b08e7ebc0085d35d3b79bdbc9e00e6e0f607ba405ba	bryan@relloagency.com	2025-09-22 16:14:47.502	f	2025-09-22 14:14:47.673565
9	3	dc7f4bb2f0f6bec50c39ebe2b2a2dc98bdffa823c0d5689d5677f4ab468a21df	bryan@relloagency.com	2025-09-22 22:05:14.91	t	2025-09-22 20:05:15.078052
10	3	1831e787115766214c11fc85bc09a2292f066a6d901fbfa83add6f3bc8d572e0	bryan@relloagency.com	2025-09-23 01:21:08.802	f	2025-09-22 23:21:08.969426
11	3	d511790c106837a345055ee5904cb2ad3b9163d75727cb8bf9655114cc6a5929	bryan@relloagency.com	2025-09-23 22:49:54.899	f	2025-09-23 20:49:55.070228
12	3	feba500a7fcd59e9c286d7a1209465e8f60d88597dbc1eafc7c216b94fad6c6e	bryan@relloagency.com	2025-09-23 22:53:23.299	f	2025-09-23 20:53:23.475223
13	3	0aabca87860f04c414db5ffb9062c3cf8b39beb98e74736b33e17f3c5b5fbd5a	bryan@relloagency.com	2025-09-23 22:58:44.617	f	2025-09-23 20:58:44.782642
14	3	8534c6bf9b7e902b3ff8d9f8f84d5d6b3f7687d7a236b2aa81eae7665bad5640	bryan@relloagency.com	2025-09-24 15:31:58.946	f	2025-09-24 13:31:59.111413
15	3	d8fa99f3984e7e32207007abe067d9f12862f64d64d7a2bb942329c274b3eebe	bryan@relloagency.com	2025-09-24 19:50:26.137	f	2025-09-24 17:50:26.304907
16	3	c56611a5c326cb01d868882742f76c25c56f878acf2af77a820cfe53978c0cb1	bryan@relloagency.com	2025-09-24 20:16:47.598	t	2025-09-24 18:16:47.79029
18	3	d82e7a456fd2e312fb5e0491167b65759ade7d1f271d116e3d7f97637fd3b42f	bryan@relloagency.com	2025-09-29 15:35:27.294	f	2025-09-29 13:35:29.478287
17	3	ee9fa937661de4f71da65c1bd05b6fa4d2719fdf3aa69b8fe7d75c2472c99d6c	bryan@relloagency.com	2025-09-29 15:33:32.498	t	2025-09-29 13:33:32.666769
\.


--
-- Data for Name: dealer_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealer_sessions (id, dealer_id, expires_at, created_at) FROM stdin;
2897ce49-c969-4559-97b4-a4438bf52961	1	2025-08-17 18:10:08.115	2025-08-16 18:10:08.289281
493f84f9-f79b-48e2-93b5-81071f7e3566	1	2025-08-17 18:21:50.191	2025-08-16 18:21:50.356662
10270f6a-dbf6-4567-8c5f-77cfc1793036	1	2025-09-19 19:53:06.307	2025-09-18 19:53:06.475481
f3cf302f-7432-4302-bffe-5003e49a6908	3	2025-09-30 13:39:03.327	2025-09-29 13:39:03.364115
8f175147-20a1-4331-a4a3-4afa22444865	3	2025-09-30 13:44:20.926	2025-09-29 13:44:20.963702
352222a8-063c-4dd2-956e-7e5b7bb65928	3	2025-10-01 13:34:31.747	2025-09-30 13:34:31.784914
55369dcb-f8c6-4c53-bf1d-f492c916f3c3	3	2025-10-01 13:37:14.806	2025-09-30 13:37:14.842376
c393e06d-78fc-4766-b0a0-e50ed9935a1b	3	2025-10-01 13:55:59.347	2025-09-30 13:55:59.387761
14732c8b-2c66-484b-b0a5-af6215ec075c	3	2025-10-01 18:09:27.186	2025-09-30 18:09:27.22451
b27dd26c-8ccd-46c6-9890-a8d4b09148d5	3	2025-10-01 18:25:09.264	2025-09-30 18:25:09.301471
d1ddd1d8-24e3-479f-95e8-a8b212640a17	3	2025-10-01 18:26:38.936	2025-09-30 18:26:38.972136
37f98c0d-1426-4398-906d-f888a6aabba7	3	2025-10-02 13:49:05.139	2025-10-01 13:49:05.175876
51c7e0d7-4fbd-42fb-a749-52d6de07dd8e	3	2025-10-03 03:42:53.6	2025-10-02 03:42:53.638313
\.


--
-- Data for Name: dealer_user_sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealer_user_sessions (id, user_id, dealer_id, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: dealer_users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealer_users (id, dealer_id, username, email, first_name, last_name, title, password_hash, role, is_active, last_login, created_at, updated_at, reset_token, reset_token_expiry) FROM stdin;
\.


--
-- Data for Name: dealers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dealers (id, dealer_id, dealer_name, contact_name, email, phone, territory, address, city, state, zip_code, password_hash, is_active, created_at, updated_at, company_name, website, contact_first_name, contact_last_name, contact_email, contact_title) FROM stdin;
2	D002	XYZ Equipment Co	Jane Doe	jane@xyzequip.com	555-0200	Southeast	456 Oak Ave	Atlanta	GA	30301	$2b$10$/gl08vdV.f1.pIM2BgaIIutLIw0.agj8XRfKk.zOtvZlb.Mm7STaG	t	2025-08-16 04:44:51.352615	2025-08-16 04:44:51.352615	XYZ Equipment Co	\N	Jane	Doe	jane@xyzequip.com	\N
3	D003	Test	Bryan Cuellar	bryan@relloagency.com	8888888888	\N	\N	\N	\N	\N	$2b$12$tKQeuBJ61VCUHDPmGGBcFOCSmvBew09RryZKR/jbiMa9IrTgXZoYe	t	2025-09-19 13:42:19.808791	2025-09-29 13:38:36.898	\N	\N	\N	\N	\N	\N
1	D001	ABC Trailers Inc	John Smith Updated	john@abctrailers.com	555-0101	Northeast	123 Main St	Boston	MA	02101	$2b$12$mZvZy6iIbEbxI7weuomUwO6r0wtPNwKnz/S3PUf0oQMHlBQfTdsiq	t	2025-08-16 04:44:51.352615	2025-08-16 18:57:26.089	ABC Trailers Inc	\N	John	Smith Updated	john@abctrailers.com	\N
\.


--
-- Data for Name: media_files; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.media_files (id, filename, original_name, object_path, mime_type, file_size, width, height, alt_text, description, tags, uploaded_by, usage_count, is_active, created_at, updated_at) FROM stdin;
1	f7c7bcc5-2f2a-4f9b-a716-3587ce28f6d5	Dump Trailers_category_image	/objects/models/f7c7bcc5-2f2a-4f9b-a716-3587ce28f6d5	image/jpeg	0	\N	\N	Dump Trailers category image	Category image for Dump Trailers	["category", "dump"]	1	1	t	2025-08-23 03:43:01.737115	2025-08-23 03:43:01.737115
2	3f794503-3b00-475e-9d21-bdeeb54b8f44	Landscape Trailers_category_image	/objects/models/3f794503-3b00-475e-9d21-bdeeb54b8f44	image/jpeg	0	\N	\N	Landscape Trailers category image	Category image for Landscape Trailers	["category", "landscape"]	1	1	t	2025-08-23 03:43:01.885509	2025-08-23 03:43:01.885509
3	1d7316a1-233d-4a77-92c4-a3a783f4e1f8	Flatbeds & Deck Overs_category_image	/objects/models/1d7316a1-233d-4a77-92c4-a3a783f4e1f8	image/jpeg	0	\N	\N	Flatbeds & Deck Overs category image	Category image for Flatbeds & Deck Overs	["category", "flatbed"]	1	1	t	2025-08-23 03:43:02.020424	2025-08-23 03:43:02.020424
4	dd70354b-f6fe-47e4-b380-1ea20cb78ace	Equipment & Tilt Trailers_category_image	/objects/models/dd70354b-f6fe-47e4-b380-1ea20cb78ace	image/jpeg	0	\N	\N	Equipment & Tilt Trailers category image	Category image for Equipment & Tilt Trailers	["category", "equipment-tilt"]	1	1	t	2025-08-23 03:43:02.159557	2025-08-23 03:43:02.159557
5	14746c8e-79be-4b1a-adde-848750ebe241	Tilt Equipment Trailers_category_image	/objects/models/14746c8e-79be-4b1a-adde-848750ebe241	image/jpeg	0	\N	\N	Tilt Equipment Trailers category image	Category image for Tilt Equipment Trailers	["category", "tilt"]	1	1	t	2025-08-23 03:43:02.295358	2025-08-23 03:43:02.295358
6	17b58050-ecdc-4258-ba9a-bf5fe5bbce01	DHO212 - 8' Wide Deckover 24K Dump_model_image	/objects/models/17b58050-ecdc-4258-ba9a-bf5fe5bbce01	image/jpeg	0	\N	\N	DHO212 - 8' Wide Deckover 24K Dump model image	Model image for DHO212 - 8' Wide Deckover 24K Dump	["model", "DHO212"]	1	1	t	2025-08-23 03:43:02.509726	2025-08-23 03:43:02.509726
7	41c53a0c-a1ff-4410-b6a5-a71ef7f68599	DHO210 - 8' Wide Deckover 20K Dump_model_image	/objects/models/41c53a0c-a1ff-4410-b6a5-a71ef7f68599	image/jpeg	0	\N	\N	DHO210 - 8' Wide Deckover 20K Dump model image	Model image for DHO210 - 8' Wide Deckover 20K Dump	["model", "DHO210"]	1	1	t	2025-08-23 03:43:02.647162	2025-08-23 03:43:02.647162
9	875b632c-ee96-4f25-98d1-777bd842e949	BDE207 - I-Beam Deckover 14K_model_image	/objects/models/875b632c-ee96-4f25-98d1-777bd842e949	image/jpeg	0	\N	\N	BDE207 - I-Beam Deckover 14K model image	Model image for BDE207 - I-Beam Deckover 14K	["model", "BDE207"]	1	1	t	2025-08-23 03:43:02.919123	2025-08-23 03:43:02.919123
10	ddbf5bf2-751c-4252-a0f0-bb1e3036ca36	BDE307 - I-Beam Deckover 21K_model_image	/objects/models/ddbf5bf2-751c-4252-a0f0-bb1e3036ca36	image/jpeg	0	\N	\N	BDE307 - I-Beam Deckover 21K model image	Model image for BDE307 - I-Beam Deckover 21K	["model", "BDE307"]	1	1	t	2025-08-23 03:43:03.054203	2025-08-23 03:43:03.054203
11	a582483d-81d8-4d66-b9ca-ff3d8a1fa407	DHV207 - 7' Wide 14K Dump_model_image	/objects/models/a582483d-81d8-4d66-b9ca-ff3d8a1fa407	image/jpeg	0	\N	\N	DHV207 - 7' Wide 14K Dump model image	Model image for DHV207 - 7' Wide 14K Dump	["model", "DHV207"]	1	1	t	2025-08-23 03:43:03.189109	2025-08-23 03:43:03.189109
12	752dac94-5104-4660-8034-905f189ce604	DHV208 - 7' Wide 16K Dump_model_image	/objects/models/752dac94-5104-4660-8034-905f189ce604	image/jpeg	0	\N	\N	DHV208 - 7' Wide 16K Dump model image	Model image for DHV208 - 7' Wide 16K Dump	["model", "DHV208"]	1	1	t	2025-08-23 03:43:03.323629	2025-08-23 03:43:03.323629
13	5290dab1-76a9-4359-88a4-65e9cad1234a	FBX210 - Gooseneck Deckover 20K_model_image	/objects/models/5290dab1-76a9-4359-88a4-65e9cad1234a	image/jpeg	0	\N	\N	FBX210 - Gooseneck Deckover 20K model image	Model image for FBX210 - Gooseneck Deckover 20K	["model", "FBX210"]	1	1	t	2025-08-23 03:43:03.459101	2025-08-23 03:43:03.459101
14	bc34912e-77b2-4d4d-a814-a50d9eec67cc	FBX307 - Triple Axle Gooseneck 21K_model_image	/objects/models/bc34912e-77b2-4d4d-a814-a50d9eec67cc	image/jpeg	0	\N	\N	FBX307 - Triple Axle Gooseneck 21K model image	Model image for FBX307 - Triple Axle Gooseneck 21K	["model", "FBX307"]	1	1	t	2025-08-23 03:43:03.594966	2025-08-23 03:43:03.594966
15	bfb873f5-b2b9-4d1a-843a-ee39ab1a18e5	FBH208 - Gooseneck Deckover 16K_model_image	/objects/models/bfb873f5-b2b9-4d1a-843a-ee39ab1a18e5	image/jpeg	0	\N	\N	FBH208 - Gooseneck Deckover 16K model image	Model image for FBH208 - Gooseneck Deckover 16K	["model", "FBH208"]	1	1	t	2025-08-23 03:43:03.72935	2025-08-23 03:43:03.72935
16	34d29691-24e7-4e7d-a1b8-b3b3aeb4b652	FBH207 - Gooseneck Deckover 14K_model_image	/objects/models/34d29691-24e7-4e7d-a1b8-b3b3aeb4b652	image/jpeg	0	\N	\N	FBH207 - Gooseneck Deckover 14K model image	Model image for FBH207 - Gooseneck Deckover 14K	["model", "FBH207"]	1	1	t	2025-08-23 03:43:03.863553	2025-08-23 03:43:03.863553
17	e49ae4e5-28e5-4bdb-bd2a-3faab5361959	DHO215 - 8' Wide Deckover 30K Dump_model_image	/objects/models/e49ae4e5-28e5-4bdb-bd2a-3faab5361959	image/jpeg	0	\N	\N	DHO215 - 8' Wide Deckover 30K Dump model image	Model image for DHO215 - 8' Wide Deckover 30K Dump	["model", "DHO215"]	1	1	t	2025-08-23 03:43:03.999023	2025-08-23 03:43:03.999023
18	5fe401eb-81d5-432a-a217-bbe7e108bad0	3 Watt Solar Charger_option_image	/objects/models/5fe401eb-81d5-432a-a217-bbe7e108bad0	image/jpeg	0	\N	\N	3 Watt Solar Charger option image	Option image for 3 Watt Solar Charger	["option", "extras"]	1	1	t	2025-08-23 03:43:04.206346	2025-08-23 03:43:04.206346
19	2253a91d-fe9f-463b-b6f8-7531a6a915a8	3 Watt Solar Charger_option_image	/objects/models/2253a91d-fe9f-463b-b6f8-7531a6a915a8	image/jpeg	0	\N	\N	3 Watt Solar Charger option image	Option image for 3 Watt Solar Charger	["option", "extras"]	1	1	t	2025-08-23 03:43:04.341398	2025-08-23 03:43:04.341398
8	photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400	BDE208 - I-Beam Deckover 16K_model_image	https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400	image/jpeg	0	\N	\N	BDE208 - I-Beam Deckover 16K model image	Model image for BDE208 - I-Beam Deckover 16K	["model", "BDE208"]	1	1	f	2025-08-23 03:43:02.782205	2025-08-23 03:43:19.159
20	a25d8b1f-f846-4d38-b2ef-7801fc07337a	test_model_image	/objects/models/a25d8b1f-f846-4d38-b2ef-7801fc07337a	image/jpeg	0	\N	\N	test model image	Model image for test	["model", "test"]	1	1	t	2025-09-23 18:49:55.529314	2025-09-23 18:49:55.529314
21	87810a6c-ab51-4ace-8edf-733b3843fe2f	test_category_image	/objects/models/87810a6c-ab51-4ace-8edf-733b3843fe2f	image/jpeg	0	\N	\N	test category image	Category image for test	["category", "test"]	1	1	t	2025-09-24 13:55:11.730678	2025-09-24 13:55:11.730678
22	51ec2f2b-434e-4170-8631-37ef5cbc83ba	test_series_image	/objects/models/51ec2f2b-434e-4170-8631-37ef5cbc83ba	image/jpeg	0	\N	\N	test series image	Series image for test	["series", "test"]	1	1	t	2025-09-24 14:41:44.122616	2025-09-24 14:41:44.122616
23	818833de-e348-467c-8160-84fe5b1a121e	FBH207 - Gooseneck Deckover 14K_model_image	/objects/models/818833de-e348-467c-8160-84fe5b1a121e	image/jpeg	0	\N	\N	FBH207 - Gooseneck Deckover 14K model image	Model image for FBH207 - Gooseneck Deckover 14K	["model", "FBH207"]	1	1	t	2025-10-01 13:16:29.033467	2025-10-01 13:16:29.033467
24	8250c1fd-0148-4feb-936f-327f8f6bcee2	DHO_series_image	/objects/models/8250c1fd-0148-4feb-936f-327f8f6bcee2	image/jpeg	0	\N	\N	DHO series image	Series image for DHO	["series", "dho"]	5	1	t	2026-02-12 15:51:55.939811	2026-02-12 15:51:55.939811
25	eadc1b81-0775-449e-b237-0a508a0d2f4c	TMX_series_image	/objects/models/eadc1b81-0775-449e-b237-0a508a0d2f4c	image/jpeg	0	\N	\N	TMX series image	Series image for TMX	["series", "tmx"]	5	1	t	2026-02-12 15:52:31.671324	2026-02-12 15:52:31.671324
26	e04e8fdb-1524-4767-861c-33c0dac6e88a	MPR_series_image	/objects/models/e04e8fdb-1524-4767-861c-33c0dac6e88a	image/jpeg	0	\N	\N	MPR series image	Series image for MPR	["series", "mpr"]	5	1	t	2026-02-12 15:53:04.688103	2026-02-12 15:53:04.688103
27	3186a88e-f031-45ad-8b72-ee89f73cb9a4	FBX_series_image	/objects/models/3186a88e-f031-45ad-8b72-ee89f73cb9a4	image/jpeg	0	\N	\N	FBX series image	Series image for FBX	["series", "fbx"]	5	1	t	2026-02-12 15:53:28.00465	2026-02-12 15:53:28.00465
28	bff4115f-fc4c-4bdf-9191-bf1675d8d1da	DHV_series_image	/objects/models/bff4115f-fc4c-4bdf-9191-bf1675d8d1da	image/jpeg	0	\N	\N	DHV series image	Series image for DHV	["series", "dhv"]	5	1	t	2026-02-12 15:55:40.958528	2026-02-12 15:55:40.958528
29	5de6415f-72a6-4056-8176-3bd26249d5b4	TSX_series_image	/objects/models/5de6415f-72a6-4056-8176-3bd26249d5b4	image/jpeg	0	\N	\N	TSX series image	Series image for TSX	["series", "tsx"]	5	1	t	2026-02-12 15:57:38.236376	2026-02-12 15:57:38.236376
30	19abe699-51b4-40c0-9492-b53d1bd8f005	Gooseneck Trailers_category_image	/objects/models/19abe699-51b4-40c0-9492-b53d1bd8f005	image/jpeg	0	\N	\N	Gooseneck Trailers category image	Category image for Gooseneck Trailers	["category", "flatbed"]	5	1	t	2026-02-12 16:05:43.50501	2026-02-12 16:05:43.50501
31	f0164f9e-3945-48d4-a059-2a1d57e6cd9c	Tilt Equipment Trailers_category_image	/objects/models/f0164f9e-3945-48d4-a059-2a1d57e6cd9c	image/jpeg	0	\N	\N	Tilt Equipment Trailers category image	Category image for Tilt Equipment Trailers	["category", "equipment-tilt"]	5	1	t	2026-02-12 16:06:00.770491	2026-02-12 16:06:00.770491
32	3ed5540a-b5a3-4abf-ad01-7f7915c31d3e	Dump Trailers_category_image	/objects/models/3ed5540a-b5a3-4abf-ad01-7f7915c31d3e	image/jpeg	0	\N	\N	Dump Trailers category image	Category image for Dump Trailers	["category", "dump"]	5	1	t	2026-02-12 16:06:09.598784	2026-02-12 16:06:09.598784
33	755a6a1c-1788-498d-8f6e-aa0dfdbc7922	Landscape Trailers_category_image	/objects/models/755a6a1c-1788-498d-8f6e-aa0dfdbc7922	image/jpeg	0	\N	\N	Landscape Trailers category image	Category image for Landscape Trailers	["category", "landscape"]	5	1	t	2026-02-12 16:06:18.680496	2026-02-12 16:06:18.680496
34	ce8b3e39-57f4-402c-af1a-95c963179b41	DHV207 - 7' Wide 14K Dump_model_image	/objects/models/ce8b3e39-57f4-402c-af1a-95c963179b41	image/jpeg	0	\N	\N	DHV207 - 7' Wide 14K Dump model image	Model image for DHV207 - 7' Wide 14K Dump	["model", "DHV207"]	5	1	t	2026-02-12 16:08:45.282658	2026-02-12 16:08:45.282658
35	45f9b7c1-a51f-4516-8d11-2acc4fca84c6	DHV208 - 7' Wide 16K Dump_model_image	/objects/models/45f9b7c1-a51f-4516-8d11-2acc4fca84c6	image/jpeg	0	\N	\N	DHV208 - 7' Wide 16K Dump model image	Model image for DHV208 - 7' Wide 16K Dump	["model", "DHV208"]	5	1	t	2026-02-12 16:13:50.146938	2026-02-12 16:13:50.146938
36	81598d7a-3c18-4920-a1bb-4c424f2881e7	DHO210 - 8' Wide Deckover 20K Dump_model_image	/objects/models/81598d7a-3c18-4920-a1bb-4c424f2881e7	image/jpeg	0	\N	\N	DHO210 - 8' Wide Deckover 20K Dump model image	Model image for DHO210 - 8' Wide Deckover 20K Dump	["model", "DHO210"]	5	1	t	2026-02-12 16:16:25.571159	2026-02-12 16:16:25.571159
37	86585287-3ff7-4740-9d4d-761c43f21779	TMX107 - Single Axle Mini Tilt 7k Trailer _model_image	/objects/models/86585287-3ff7-4740-9d4d-761c43f21779	image/jpeg	0	\N	\N	TMX107 - Single Axle Mini Tilt 7k Trailer  model image	Model image for TMX107 - Single Axle Mini Tilt 7k Trailer 	["model", "TMX107"]	5	1	t	2026-02-12 16:22:10.946469	2026-02-12 16:22:10.946469
38	e54e2d00-84c0-491c-a44f-ad7ae4f395f0	MPR205 - MOWPRO LANDSCAPE TRAILER_model_image	/objects/models/e54e2d00-84c0-491c-a44f-ad7ae4f395f0	image/jpeg	0	\N	\N	MPR205 - MOWPRO LANDSCAPE TRAILER model image	Model image for MPR205 - MOWPRO LANDSCAPE TRAILER	["model", "MPR205"]	5	1	t	2026-02-12 16:22:32.559815	2026-02-12 16:22:32.559815
39	9adf8447-70a4-493b-bbc0-9ea2300a63cc	MPR207 - MOWPRO LANDSCAPE TRAILER_model_image	/objects/models/9adf8447-70a4-493b-bbc0-9ea2300a63cc	image/jpeg	0	\N	\N	MPR207 - MOWPRO LANDSCAPE TRAILER model image	Model image for MPR207 - MOWPRO LANDSCAPE TRAILER	["model", "MPR207"]	5	1	t	2026-02-12 16:22:43.266212	2026-02-12 16:22:43.266212
40	efe7836e-02a1-41dc-8c55-272c88d33456	FBX215 - Gooseneck Deckover 30K Trailer_model_image	/objects/models/efe7836e-02a1-41dc-8c55-272c88d33456	image/jpeg	0	\N	\N	FBX215 - Gooseneck Deckover 30K Trailer model image	Model image for FBX215 - Gooseneck Deckover 30K Trailer	["model", "FBX215"]	5	1	t	2026-02-12 16:22:59.533347	2026-02-12 16:22:59.533347
41	67efb8c0-d6a5-440b-9075-bc0a0fe58a3e	FBX212 - Gooseneck Deckover 24K Trailer_model_image	/objects/models/67efb8c0-d6a5-440b-9075-bc0a0fe58a3e	image/jpeg	0	\N	\N	FBX212 - Gooseneck Deckover 24K Trailer model image	Model image for FBX212 - Gooseneck Deckover 24K Trailer	["model", "FBX212"]	5	1	t	2026-02-12 16:23:08.063073	2026-02-12 16:23:08.063073
42	4d115eac-519a-4608-9b55-104d0853b609	FBX210 - Gooseneck Deckover 20K_model_image	/objects/models/4d115eac-519a-4608-9b55-104d0853b609	image/jpeg	0	\N	\N	FBX210 - Gooseneck Deckover 20K model image	Model image for FBX210 - Gooseneck Deckover 20K	["model", "FBX210"]	5	1	t	2026-02-12 16:23:24.978257	2026-02-12 16:23:24.978257
43	b81f1d99-0d47-42df-b9e6-27a6cf7b3111	FBH307 - Triple Axle Gooseneck 21K_model_image	/objects/models/b81f1d99-0d47-42df-b9e6-27a6cf7b3111	image/jpeg	0	\N	\N	FBH307 - Triple Axle Gooseneck 21K model image	Model image for FBH307 - Triple Axle Gooseneck 21K	["model", "FBH307"]	5	1	t	2026-02-12 16:24:08.617006	2026-02-12 16:24:08.617006
44	d71e412a-976a-4299-aa85-33073a661e8d	DHO212 - 8' Wide Deckover 24K Dump_model_image	/objects/models/d71e412a-976a-4299-aa85-33073a661e8d	image/jpeg	0	\N	\N	DHO212 - 8' Wide Deckover 24K Dump model image	Model image for DHO212 - 8' Wide Deckover 24K Dump	["model", "DHO212"]	5	1	t	2026-02-12 16:24:32.626671	2026-02-12 16:24:32.626671
45	71266050-c2ad-4999-8d43-5423df94ebac	DHO215 - 8' Wide Deckover 30K Dump_model_image	/objects/models/71266050-c2ad-4999-8d43-5423df94ebac	image/jpeg	0	\N	\N	DHO215 - 8' Wide Deckover 30K Dump model image	Model image for DHO215 - 8' Wide Deckover 30K Dump	["model", "DHO215"]	5	1	t	2026-02-12 16:24:41.531839	2026-02-12 16:24:41.531839
46	39b412e6-97cc-4187-8ab2-db79551e42ee	TSX207 - Hydraulic Gravity Equipment Tilt 14k Trailer _model_image	/objects/models/39b412e6-97cc-4187-8ab2-db79551e42ee	image/jpeg	0	\N	\N	TSX207 - Hydraulic Gravity Equipment Tilt 14k Trailer  model image	Model image for TSX207 - Hydraulic Gravity Equipment Tilt 14k Trailer 	["model", "TSX207"]	5	1	t	2026-02-12 16:24:57.706866	2026-02-12 16:24:57.706866
47	80a79c20-2605-4635-aa27-2de2a2627abc	TSX - HYDRAULIC TILT EQUIPMENT 21K TRAILER_model_image	/objects/models/80a79c20-2605-4635-aa27-2de2a2627abc	image/jpeg	0	\N	\N	TSX - HYDRAULIC TILT EQUIPMENT 21K TRAILER model image	Model image for TSX - HYDRAULIC TILT EQUIPMENT 21K TRAILER	["model", "TSX307"]	5	1	t	2026-02-12 16:25:27.918206	2026-02-12 16:25:27.918206
48	a52742cb-00e8-4222-b56b-170928039d76	DHO210SS - 8’ Wide Super Single Wheel Deckover 20K Dump_model_image	/objects/models/a52742cb-00e8-4222-b56b-170928039d76	image/jpeg	0	\N	\N	DHO210SS - 8’ Wide Super Single Wheel Deckover 20K Dump model image	Model image for DHO210SS - 8’ Wide Super Single Wheel Deckover 20K Dump	["model", "DHO210SS"]	5	1	t	2026-02-12 16:32:34.171474	2026-02-12 16:32:34.171474
49	dc28a572-02de-45cd-9f94-7300013c7ae1	BDE208 - I-Beam Deckover 16K_model_image	/objects/models/dc28a572-02de-45cd-9f94-7300013c7ae1	image/jpeg	0	\N	\N	BDE208 - I-Beam Deckover 16K model image	Model image for BDE208 - I-Beam Deckover 16K	["model", "BDE208"]	5	1	t	2026-02-12 16:55:13.082295	2026-02-12 16:55:13.082295
50	f7766ecf-798d-45a6-9ee3-d7c97ac85efc	TSX208 - Hydraulic Gravity Equipment Tilt 16K Trailer_model_image	/objects/models/f7766ecf-798d-45a6-9ee3-d7c97ac85efc	image/jpeg	0	\N	\N	TSX208 - Hydraulic Gravity Equipment Tilt 16K Trailer model image	Model image for TSX208 - Hydraulic Gravity Equipment Tilt 16K Trailer	["model", "TSX208"]	5	1	t	2026-02-12 17:00:21.307462	2026-02-12 17:00:21.307462
51	b808dc0f-cc79-457a-b6c4-98f3dea687f8	BDE207 - I-Beam Deckover 14K_model_image	/objects/models/b808dc0f-cc79-457a-b6c4-98f3dea687f8	image/jpeg	0	\N	\N	BDE207 - I-Beam Deckover 14K model image	Model image for BDE207 - I-Beam Deckover 14K	["model", "BDE207"]	5	1	t	2026-02-12 17:03:43.183847	2026-02-12 17:03:43.183847
52	70eeec3e-e3af-4f7c-a62b-1b58a36cd6f7	BDE210 - I-Beam Deckover 20K_model_image	/objects/models/70eeec3e-e3af-4f7c-a62b-1b58a36cd6f7	image/jpeg	0	\N	\N	BDE210 - I-Beam Deckover 20K model image	Model image for BDE210 - I-Beam Deckover 20K	["model", "BDE210"]	5	1	t	2026-02-12 17:03:53.561378	2026-02-12 17:03:53.561378
53	48abec9d-c520-4169-91d8-18ad3cd1430c	FBH207 - Gooseneck Deckover 14K_model_image	/objects/models/48abec9d-c520-4169-91d8-18ad3cd1430c	image/jpeg	0	\N	\N	FBH207 - Gooseneck Deckover 14K model image	Model image for FBH207 - Gooseneck Deckover 14K	["model", "FBH207"]	5	1	t	2026-02-12 17:04:05.597779	2026-02-12 17:04:05.597779
54	b19b01f3-6f6a-4169-a1ed-c818dd568bdd	FBH208 - Gooseneck Deckover 16K_model_image	/objects/models/b19b01f3-6f6a-4169-a1ed-c818dd568bdd	image/jpeg	0	\N	\N	FBH208 - Gooseneck Deckover 16K model image	Model image for FBH208 - Gooseneck Deckover 16K	["model", "FBH208"]	5	1	t	2026-02-12 17:04:14.814356	2026-02-12 17:04:14.814356
55	3ebede60-39bb-4918-9893-b08b605f63ac	FBH210 - Super Single Wheel Gooseneck Deckover 20K_model_image	/objects/models/3ebede60-39bb-4918-9893-b08b605f63ac	image/jpeg	0	\N	\N	FBH210 - Super Single Wheel Gooseneck Deckover 20K model image	Model image for FBH210 - Super Single Wheel Gooseneck Deckover 20K	["model", "FBH210"]	5	1	t	2026-02-12 17:04:22.491755	2026-02-12 17:04:22.491755
56	c30c10f8-2ec0-444f-b2f2-3408d2fabc02	BDE212 - I-BEAM DECKOVER EQUIPMENT 24K TRAILER_model_image	/objects/models/c30c10f8-2ec0-444f-b2f2-3408d2fabc02	image/jpeg	0	\N	\N	BDE212 - I-BEAM DECKOVER EQUIPMENT 24K TRAILER model image	Model image for BDE212 - I-BEAM DECKOVER EQUIPMENT 24K TRAILER	["model", "BDE212"]	5	1	t	2026-02-12 17:05:46.704227	2026-02-12 17:05:46.704227
57	66f50d37-6f36-4576-8ab1-a0a27feb1b1c	Tag-Along Trailers_category_image	/objects/models/66f50d37-6f36-4576-8ab1-a0a27feb1b1c	image/jpeg	0	\N	\N	Tag-Along Trailers category image	Category image for Tag-Along Trailers	["category", "tag-alongs"]	5	1	t	2026-02-12 18:19:43.534934	2026-02-12 18:19:43.534934
58	c00c3de2-7c63-40b9-ad64-a862dbc970f1	BDE_series_image	/objects/models/c00c3de2-7c63-40b9-ad64-a862dbc970f1	image/jpeg	0	\N	\N	BDE series image	Series image for BDE	["series", "bde"]	5	1	t	2026-02-12 18:19:55.955443	2026-02-12 18:19:55.955443
59	f59b13a0-b647-4910-a4c3-817dc539a144	Gooseneck Trailers_category_image	/objects/models/f59b13a0-b647-4910-a4c3-817dc539a144	image/jpeg	0	\N	\N	Gooseneck Trailers category image	Category image for Gooseneck Trailers	["category", "flatbed"]	5	1	t	2026-02-12 18:28:57.971548	2026-02-12 18:28:57.971548
60	2a0849fd-2c60-4815-b130-4acd9639ba6b	BDE210 - I-Beam Deckover 20K_model_image	/objects/models/2a0849fd-2c60-4815-b130-4acd9639ba6b	image/jpeg	0	\N	\N	BDE210 - I-Beam Deckover 20K model image	Model image for BDE210 - I-Beam Deckover 20K	["model", "BDE210"]	5	1	t	2026-02-12 18:30:09.806543	2026-02-12 18:30:09.806543
61	ea46fffd-897b-4405-948a-4f148a419cdd	BDE207 - I-Beam Deckover 14K_model_image	/objects/models/ea46fffd-897b-4405-948a-4f148a419cdd	image/jpeg	0	\N	\N	BDE207 - I-Beam Deckover 14K model image	Model image for BDE207 - I-Beam Deckover 14K	["model", "BDE207"]	5	1	t	2026-02-12 18:30:18.464933	2026-02-12 18:30:18.464933
62	494cdd14-b0f2-44a4-82b2-a0d0fbce2891	BDE208 - I-Beam Deckover 16K_model_image	/objects/models/494cdd14-b0f2-44a4-82b2-a0d0fbce2891	image/jpeg	0	\N	\N	BDE208 - I-Beam Deckover 16K model image	Model image for BDE208 - I-Beam Deckover 16K	["model", "BDE208"]	5	1	t	2026-02-12 18:30:27.789598	2026-02-12 18:30:27.789598
63	840446b0-ffc1-4c8c-80b0-13b1c550b4f8	BDE212 - I-BEAM DECKOVER EQUIPMENT 24K TRAILER_model_image	/objects/models/840446b0-ffc1-4c8c-80b0-13b1c550b4f8	image/jpeg	0	\N	\N	BDE212 - I-BEAM DECKOVER EQUIPMENT 24K TRAILER model image	Model image for BDE212 - I-BEAM DECKOVER EQUIPMENT 24K TRAILER	["model", "BDE212"]	5	1	t	2026-02-12 18:30:37.888156	2026-02-12 18:30:37.888156
64	0b773635-015d-4407-8a9d-8e5e98ba8c45	FBH_series_image	/objects/models/0b773635-015d-4407-8a9d-8e5e98ba8c45	image/jpeg	0	\N	\N	FBH series image	Series image for FBH	["series", "fbh"]	5	1	t	2026-02-12 19:27:14.920144	2026-02-12 19:27:14.920144
65	fde55d63-d054-4111-8076-89b429088146	FBH207 - Gooseneck Deckover 14K_model_image	/objects/models/fde55d63-d054-4111-8076-89b429088146	image/jpeg	0	\N	\N	FBH207 - Gooseneck Deckover 14K model image	Model image for FBH207 - Gooseneck Deckover 14K	["model", "FBH207"]	5	1	t	2026-02-12 19:27:30.383062	2026-02-12 19:27:30.383062
66	23d55650-50b5-465c-a461-0a7d06f70f49	FBH208 - Gooseneck Deckover 16K_model_image	/objects/models/23d55650-50b5-465c-a461-0a7d06f70f49	image/jpeg	0	\N	\N	FBH208 - Gooseneck Deckover 16K model image	Model image for FBH208 - Gooseneck Deckover 16K	["model", "FBH208"]	5	1	t	2026-02-12 19:27:37.462093	2026-02-12 19:27:37.462093
67	9823739f-678b-4134-82a3-bab27cbecc3c	FBH210 - Super Single Wheel Gooseneck Deckover 20K_model_image	/objects/models/9823739f-678b-4134-82a3-bab27cbecc3c	image/jpeg	0	\N	\N	FBH210 - Super Single Wheel Gooseneck Deckover 20K model image	Model image for FBH210 - Super Single Wheel Gooseneck Deckover 20K	["model", "FBH210"]	5	1	t	2026-02-12 19:27:47.09957	2026-02-12 19:27:47.09957
68	306d898f-7647-4c89-91a9-e264ad38c166	Torque Tube_option_image	/objects/models/306d898f-7647-4c89-91a9-e264ad38c166	image/jpeg	0	\N	\N	Torque Tube option image	Option image for Torque Tube	["option", "extras"]	5	1	t	2026-02-12 19:53:42.576382	2026-02-12 19:53:42.576382
69	587be062-5c84-4ce0-880b-ed41fc576ddc	LED Light Bar_option_image	/objects/models/587be062-5c84-4ce0-880b-ed41fc576ddc	image/jpeg	0	\N	\N	LED Light Bar option image	Option image for LED Light Bar	["option", "extras"]	5	1	t	2026-02-12 19:56:44.680773	2026-02-12 19:56:44.680773
70	1c90738f-138a-4e12-a7d7-5dd573c9cebd	Under Deck Storage Box (37” x 10” x 12”)_option_image	/objects/models/1c90738f-138a-4e12-a7d7-5dd573c9cebd	image/jpeg	0	\N	\N	Under Deck Storage Box (37” x 10” x 12”) option image	Option image for Under Deck Storage Box (37” x 10” x 12”)	["option", "extras"]	1	1	t	2026-03-06 15:51:11.435527	2026-03-06 15:51:11.435527
71	1a70d16f-2692-49f4-847c-77f37631d6d6	Under Deck Storage Box (37” x 10” x 12”)_option_image	/objects/models/1a70d16f-2692-49f4-847c-77f37631d6d6	image/jpeg	0	\N	\N	Under Deck Storage Box (37” x 10” x 12”) option image	Option image for Under Deck Storage Box (37” x 10” x 12”)	["option", "extras"]	1	1	t	2026-03-06 23:18:44.65195	2026-03-06 23:18:44.65195
72	4dafb90f-8af8-4432-875c-30c062595cdd	asdf_category_image	/objects/models/4dafb90f-8af8-4432-875c-30c062595cdd	image/jpeg	0	\N	\N	asdf category image	Category image for asdf	["category", "sdf"]	1	1	t	2026-03-06 23:29:12.964109	2026-03-06 23:29:12.964109
73	e98c21e4-14a6-43c9-8682-ea357d4eb5d0	as_series_image	/objects/models/e98c21e4-14a6-43c9-8682-ea357d4eb5d0	image/jpeg	0	\N	\N	as series image	Series image for as	["series", "as"]	1	1	t	2026-03-07 04:52:09.504895	2026-03-07 04:52:09.504895
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.password_reset_tokens (id, user_id, token, email, expires_at, is_used, created_at) FROM stdin;
1	1	0806a0efc251bc1af62f323e357836a987b327c86061e6bd20b7746021423b5b	stuart@relloagency.com	2025-08-28 04:31:26.608	f	2025-08-28 03:31:26.645082
2	1	237425e30ec3fd92d4fbef469822f0fe9d182767f969957483c901dfd6f63d8c	stuart@relloagency.com	2025-08-28 04:43:12.552	f	2025-08-28 03:43:12.656025
3	6	b165df0c936999e05e3e9e98f6c1cc5a355a63623c140cf835bcf4bb6108922f	bryan@relloagency.com	2025-09-19 20:09:57.621	f	2025-09-19 19:09:57.658172
4	7	74d07b04e820c376a39fa3ae6925c78524b3caaf7abcc87ce824731c14ee4fe9	brycuellar05@gmail.com	2025-09-24 14:23:07.358	f	2025-09-24 13:23:07.525129
\.


--
-- Data for Name: quote_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.quote_requests (id, first_name, last_name, zip_code, mobile, email, company, comments, opt_in, age_verification, category_id, category_name, model_id, model_name, selected_options, total_price, trailer_specs, status, notes, created_at, updated_at) FROM stdin;
12	Test	Test	84049	888888888	taylor@waltontrailers.com			t	t	6	Gooseneck Trailers	FBX212	FBX212 - (Tandem 12K axles)	{"length":"length_FBX212_1","color":202,"jack":66,"extras":[70]}	23237	{"gvwr":"25,500 lbs","payload":"19,298 lbs","deckSize":"96.5” x 28’","axles":"Dual 12K"}	pending	\N	2026-02-13 21:17:30.414033	2026-02-13 21:17:30.414033
\.


--
-- Data for Name: trailer_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trailer_categories (id, slug, name, description, image_url, starting_price, is_archived, order_index) FROM stdin;
6	flatbed	Gooseneck Trailers		/objects/models/f59b13a0-b647-4910-a4c3-817dc539a144	12408	f	1
7	equipment-tilt	Tilt Equipment Trailers		/objects/models/f0164f9e-3945-48d4-a059-2a1d57e6cd9c	6783	f	2
8	dump	Dump Trailers		/objects/models/3ed5540a-b5a3-4abf-ad01-7f7915c31d3e	12493	f	4
9	landscape	Landscape Trailers		/objects/models/755a6a1c-1788-498d-8f6e-aa0dfdbc7922	12942	f	5
18	tag-alongs	Tag-Along Trailers		/objects/models/66f50d37-6f36-4576-8ab1-a0a27feb1b1c	13662	f	6
\.


--
-- Data for Name: trailer_lengths; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trailer_lengths (id, model_id, length, pull_type, is_archived, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: trailer_models; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trailer_models (id, category_id, model_id, name, "(old)", axles, base_price, image_url, features, is_archived, category_sub_type, series_id, model_series, length_options, length_price, pulltype_options, length_gvwr, length_payload, deck_size, length_order, model_3d_url, category_order, image_urls) FROM stdin;
12	8	DHV207	DHV207 - (Tandem 7K axles)	83" x 14-16'	Dual 7K	12493	/objects/models/32cb6286-be9b-4af3-9fcb-d828410d13dd	["516 Scissor Hoist", "Combo Barn/Spreader Gate", "Pull Style Tarp", "72\\" Slide-In Ramps", "4 D-Rings"]	f	\N	27	\N	["14' (B)","16' (B)","14' (G)","16' (G)"]	{"14' (B)":0,"16' (B)":500,"14' (G)":1562,"16' (G)":2062}	{"14' (B)":"Bumper Pull","16' (B)":"Bumper Pull","14' (G)":"Gooseneck","16' (G)":"Gooseneck"}	{"14' (B)":"14,900 lbs","16' (B)":"14,900 lbs","14' (G)":"15,500 lbs","16' (G)":"15,500 lbs"}	{"14' (B)":"9,820 lbs","16' (B)":"9,570 lbs","14' (G)":"9,900 lbs","16' (G)":"9,650 lbs"}	{"14' (B)":"83” x 14’","16' (B)":"83” x 16’","14' (G)":"83” x 14’","16' (G)":"83” x 16’"}	{"14' (B)": 1, "14' (G)": 2, "16' (B)": 3, "16' (G)": 4}	/objects/models/7b7dbd33-e3b1-462e-ac04-83eba6457881	{"jack": 30, "tarp": 20, "color": 10, "ramps": 60, "tires": 40, "walls": 50, "extras": 70, "length": 0}	["/objects/models/32cb6286-be9b-4af3-9fcb-d828410d13dd", "/objects/models/c18ede57-9db5-4195-8ce9-dbc3cc1d3872", "/objects/models/9f79e843-2b23-4938-a9f6-679824d87eaa", "/objects/models/fae90e92-7bf9-463f-940d-7876346401b2", "/objects/models/40e19db2-f6ca-4d53-9767-74e70bb19d6c", "/objects/models/fcc58d42-a1a0-40da-acfb-c6de47ba4c88"]
16	8	DHO215	DHO215 - (Tandem 15K axles)	92" x 16-20'	Dual 15K	28983	/objects/models/71266050-c2ad-4999-8d43-5423df94ebac	["630 Scissor Hoist", "4' Solid Sides", "10\\" x 22 lb I-Beam", "96\\" Slide-In Ramps", "Dexter Oil Bath Axles"]	f	\N	28	\N	["16'","18'","20'"]	{"18'":550,"20'":1100}	{"16'":"Gooseneck","18'":"Gooseneck","20'":"Gooseneck"}	{"16'":"30,000 lbs","18'":"30,000 lbs","20'":"30,000 lbs"}	{"16'":"23,450 lbs","18'":"22,850 lbs","20'":"22,250 lbs"}	{"16'":"92” x 16’","18'":"92” x 18’","20'":"92” x 20’ "}	{"16'": 1, "18'": 2, "20'": 3}	\N	\N	\N
9	7	BDE207	BDE207 - (Tandem 7K axles)	96.5" x 18-22'	Dual 7K	9355	/objects/models/ea46fffd-897b-4405-948a-4f148a419cdd	["96\\" Slide Out Ramps", "10\\" x 15 lb I-Beam", "Locking Toolbox", "12K Drop Leg Jack", "Spare Tire Mount"]	f	\N	26	\N	["18'","20'","22'"]	{"18'":0,"20'":349,"22'":700}	{"18'":"Bumper Pull","20'":"Bumper Pull","22'":"Bumper Pull"}	{"18'":"14,000 lbs","20'":"14,000 lbs","22'":"14,000 lbs"}	{"18'":"10,550 lbs","20'":"10,410 lbs","22'":"10,270 lbs"}	{"18'":"96.5” x 18’ ","20'":"96.5” x 20’ ","22'":"96.5” x 22’"}	{"18'": 1, "20'": 2, "22'": 3}	\N	\N	\N
31	6	FBH210	FBH210 - (Tandem 10K axles)	96.5” x 24’	Dual 10K	17011	/objects/models/9823739f-678b-4134-82a3-bab27cbecc3c	[]	f	\N	1	\N	["24'","26'","28'","30'"]	{"24'":0,"26'":400,"28'":800,"30'":1200}	{"24'":"Gooseneck","26'":"Gooseneck","28'":"Gooseneck","30'":"Gooseneck"}	{"24'":"23,000 lbs","26'":"23,000 lbs","28'":"23,000 lbs","30'":"23,000 lbs"}	{"24'":"17,275 lbs","26'":"17,050 lbs","28'":"16,825 lbs","30'":"16,600 lbs"}	\N	{"24'": 1, "26'": 2, "28'": 3, "30'": 4}	\N	\N	\N
32	6	FBX212	FBX212 - (Tandem 12K axles)	96.5” x 26’ 	Dual 12K	19677	/objects/models/67efb8c0-d6a5-440b-9075-bc0a0fe58a3e	[]	f	\N	15	\N	["26'","28'","30'","32'","24'"]	{"26'":450,"28'":900,"30'":1350,"32'":1800}	{"26'":"Gooseneck","28'":"Gooseneck","30'":"Gooseneck","32'":"Gooseneck","24'":"Gooseneck"}	{"26'":"25,500 lbs","28'":"25,500 lbs","30'":"25,500 lbs","32'":"25,500 lbs","24'":"25,500 lbs"}	{"26'":"19,474 lbs","28'":"19,298 lbs","30'":"19,118 lbs","32'":"18,942 lbs","24'":"19,650 lbs"}	{"26'":"96.5” x 26’ ","28'":"96.5” x 28’","30'":"96.5” x 30’","32'":"96.5” x 32’","24'":"96.5\\" x 24'"}	{"24'": 1, "26'": 2, "28'": 3, "30'": 4, "32'": 5}	\N	\N	\N
50	8	DST235	DST235 - 5’ WIDE DUMP TRAILER	\N	Dual 35K	8346	/objects/models/default-model.png	[]	t	\N	10	\N	["10'"]	\N	{"10'":"Bumper Pull"}	{"10'":"7,000"}	{"10'":"4,384"}	{"10'":"60” x 10’"}	{"10'": 1}	\N	\N	\N
8	6	FBX210	FBX210 - (Tandem 10K axles)	96.5" x 24-30'	Dual 10K	16903	/objects/models/4d115eac-519a-4608-9b55-104d0853b609	["Mega Ramps", "10\\" x 19 lb I-Beam", "Chain Spool", "Dexter GD Oil Bath Axles", "Front Lockable Toolbox"]	f	\N	15	\N	["24'","26'","28'","30'"]	{"24'":0,"26'":450,"28'":900,"30'":1350}	{"24'":"Gooseneck","26'":"Gooseneck","28'":"Gooseneck","30'":"Gooseneck"}	{"24'":"23,000 lbs","26'":"23,000 lbs","28'":"23,000 lbs","30'":"23,000 lbs"}	{"24'":"17,168 lbs","26'":"16,974 lbs","28'":"16,798 lbs","30'":"16,638 lbs"}	{"24'":"96.5” x 24’","26'":"96.5” x 26’","28'":"96.5” x 28’","30'":"96.5” x 30’"}	{"24'": 1, "26'": 2, "28'": 3, "30'": 4}	\N	\N	\N
48	7	BDE212	BDE212 - (Tandem 12K axles)	\N	Dual 12K	16025	/objects/models/840446b0-ffc1-4c8c-80b0-13b1c550b4f8	[]	f	\N	26	\N	["24'","26'","28'","30'"]	{"26'":400,"28'":800,"30'":1200}	{"24'":"Pintle","26'":"Pintle","28'":"Pintle","30'":"Pintle"}	{"24'":"24,000 lbs","26'":"24,000 lbs","28'":"24,000 lbs","30'":"24,000 lbs"}	{"24'":"18,680 lbs","26'":"18,500 lbs","28'":"18,320 lbs","30'":"18,140 lbs"}	{"24'":"96.5” x 24’","26'":"96.5” x 26’ ","28'":"96.5” x 28’","30'":"96.5” x 30’"}	{"24'": 1, "26'": 2, "28'": 3, "30'": 4}	\N	\N	\N
10	7	BDE208	BDE208 - (Tandem 8K axles)	96.5" x 18-22'	Dual 8K	12157	/objects/models/494cdd14-b0f2-44a4-82b2-a0d0fbce2891	["96\\" Slide Out Ramps", "10\\" x 19 lb I-Beam", "Dexter Oil Bath Axles", "12K Drop Leg Jack", "Locking Toolbox"]	f	\N	26	\N	["18'","20'","22'"]	{"20'":350,"22'":700}	{"18'":"Bumper Pull","20'":"Bumper Pull","22'":"Bumper Pull"}	{"18'":"16,000 lbs","20'":"16,000 lbs","22'":"16,000 lbs"}	{"18'":"12,450 lbs","20'":"12,310 lbs","22'":"12,170 lbs"}	{"18'":"96.5” x 18’","20'":"96.5” x 20’ ","22'":"96.5” x 22’"}	{"18'": 1, "20'": 2, "22'": 3}	\N	\N	\N
6	6	FBH208	FBH208 - (Tandem 8K axles)	96.5" x 20-26'	Dual 8K	15061	/objects/models/23d55650-50b5-465c-a461-0a7d06f70f49	["Mega Ramps", "10\\" x 19 lb I-Beam", "Dexter Oil Bath Axles", "Dual 12K Drop Leg Jacks", "Front Lockable Toolbox"]	f	\N	1	\N	["20'","22'","24'","26'"]	{"22'":350,"24'":700,"26'":1050}	{"20'":"Gooseneck","22'":"Gooseneck","24'":"Gooseneck","26'":"Gooseneck"}	{"20'":"18,000 lbs ","22'":"18,000 lbs","24'":"18,000 lbs","26'":"18,000 lbs"}	{"20'":"13,432 ","22'":"13,272","24'":"13,122","26'":"12,952"}	{"20'":"96.5” x 20’","22'":"96.5” x 22’","24'":"96.5” x 24’","26'":"96.5” x 26’"}	{"20'": 1, "22'": 2, "24'": 3, "26'": 4}	\N	\N	\N
34	7	TMX107	TMX107 - (Single 7K axle)	71.5” x 12’ 	Single 7K	6783	/objects/models/86585287-3ff7-4740-9d4d-761c43f21779	[]	f	\N	8	\N	["12'"]	\N	{"12'":"Bumper Pull"}	{"12'":"7,000 lbs"}	{"12'":"5,073 lbs"}	{"12'":"71.5” x 12’"}	{"12'": 1}	\N	\N	\N
14	8	DHO210	DHO210 - (Tandem 10K axles)	92" x 16-18'	Dual 10K	20861	/objects/models/81598d7a-3c18-4920-a1bb-4c424f2881e7	["620 Scissor Hoist", "10\\" x 19 lb I-Beam", "Pull Style Tarp", "96\\" Slide-In Ramps", "Dual 12K Drop Leg Jacks"]	f	\N	28	\N	["16' (B)","16' (G)","18' (G)"]	{"16' (G)":1509,"18' (G)":2059}	{"16' (B)":"Bumper Pull","16' (G)":"Gooseneck","18' (G)":"Gooseneck"}	{"16' (B)":"20,000 lbs","16' (G)":"23,000 lbs","18' (G)":"23,000 lbs"}	{"16' (B)":"14,850 lbs","16' (G)":"16,650 lbs","18' (G)":"16,050 lbs"}	{"16' (B)":"92” x 16’","16' (G)":"92” x 16’ ","18' (G)":"92” x 18’"}	{"16' (B)": 1, "16' (G)": 2, "18' (G)": 3}	\N	\N	\N
35	7	TSX207	TSX207 - (Tandem 7K axles)	85” x 16’	Dual 7K	11012	/objects/models/39b412e6-97cc-4187-8ab2-db79551e42ee	[]	f	\N	19	\N	["20' (B)","22' (B)","22' (G)","20' (G)","16' (B)"]	{"20' (B)":320,"22' (B)":640,"24' (B)":956,"22' (G)":2113,"20' (G)":1793}	{"20' (B)":"Bumper Pull","22' (B)":"Bumper Pull","20' (G)":"Gooseneck","22' (G)":"Gooseneck","16' (B)":"Bumper Pull"}	{"20' (B)":"14,000","22' (B)":"14,000","20' (G)":"15,500 ","22' (G)":"15,500","16' (B)":"14,000"}	{"16' (B)":"10,550 lbs","20' (B)":"10,230 lbs","22' (B)":"10,050 lbs","20' (G)":"11,032 lbs","22' (G)":"10,852 lbs"}	{"16' (B)":"85” x 16’ ","20' (B)":"85” x 16’ + 4’ ","22' (B)":"85” x 16’ + 6’","20' (G)":"85” x 16’ + 4’ ","22' (G)":"85” x 16’ + 6’ "}	{"16' (B)": 5, "20' (B)": 1, "20' (G)": 4, "22' (B)": 2, "22' (G)": 3}	\N	\N	\N
5	6	FBH207	FBH207 - (Tandem 7K axles)	96.5" x 20-26'	Dual 7K	12408	/objects/models/fde55d63-d054-4111-8076-89b429088146	["Mega Ramps", "10\\" x 15 lb I-Beam", "2\\" x 10\\" Oil Treated Lumber", "Dual 12K Drop Leg Jacks", "Front Lockable Toolbox"]	f	\N	1	\N	["20'","22'","24'","26'"]	{"20\\"":0,"22\\"":614,"24\\"":1229,"26\\"":1843,"22'":350,"24'":700,"26'":1050,"20'":0}	{"20'":"Gooseneck","22'":"Gooseneck","24'":"Gooseneck","26'":"Gooseneck"}	{"20'":"15,500 lbs","22'":"15,500 lbs","24'":"15,500 lbs","26'":"15,500 lbs"}	{"20'":"10,432 lbs","22'":"10,272 lbs","24'":"10,080 lbs","26'":"9,904 lbs"}	{"20'":"96.5” x 20’","22'":"96.5” x 22’ ","24'":"96.5” x 24’ ","26'":"96.5” x 26’"}	{"20'": 1, "22'": 2, "24'": 3, "26'": 4}	\N	\N	\N
7	6	FBH307	FBH307 - (Triple 7K axles)	96.5" x 24-28'	Triple 7K	16453	/objects/models/b81f1d99-0d47-42df-b9e6-27a6cf7b3111	["Mega Ramps", "10\\" x 19 lb I-Beam", "Chain Spool", "Dexter E-Z Lube Axles", "Front Lockable Toolbox"]	f	\N	1	\N	["24'","26'","28'"]	{"26'":400,"28'":800}	{"24'":"Gooseneck","26'":"Gooseneck","28'":"Gooseneck"}	{"24'":"24,000 lbs","26'":"24,000 lbs","28'":"24,000 lbs"}	{"24'":"18,700 lb","26'":"18,520 lb","28'":"18,520 lb"}	{"24'":"96.5” x 24’","26'":"96.5” x 26’","28'":"96.5” x 28’"}	{"24'": 1, "26'": 2, "28'": 3}	\N	\N	\N
39	7	THO212	THO212 - DUAL WHEEL DECKOVER TILT 24K	\N	Dual 12K	25722	/objects/models/default-model.png	[]	t	\N	24	\N	["26' (P)","28' (P)","30' (P)","26' (G)","28' (G)","30' (G)"]	{"28' (G)":1843,"28' (P)":478,"30' (P)":956,"26' (G)":1365,"30' (G)":2321}	{"26' (P)":"Pintle","28' (P)":"Pintle","30' (P)":"Pintle","26' (G)":"Gooseneck","28' (G)":"Gooseneck","30' (G)":"Gooseneck"}	{"26' (P)":"24,000 lbs","28' (P)":"24,000 lbs","30' (P)":"24,000 lbs","26' (G)":"25,500 lbs","28' (G)":"25,500 lbs","30' (G)":"25,500 lbs"}	{"26' (P)":"18,778","28' (P)":"18,598 ","30' (P)":"18,418","26' (G)":"18,630","28' (G)":"18,450 ","30' (G)":"18,270"}	{"26' (P)":"96.5” x 26’","28' (P)":"96.5” x 28’ ","30' (P)":"96.5” x 30’ ","26' (G)":"96.5” x 26’","28' (G)":"96.5” x 28’ ","30' (G)":"96.5” x 30’"}	{"26' (G)": 4, "26' (P)": 1, "28' (G)": 5, "28' (P)": 2, "30' (G)": 6, "30' (P)": 3}	\N	\N	\N
37	7	TSX307	TSX307 - (Triple 7K axles)	\N	Triple 7K	14759	/objects/models/80a79c20-2605-4635-aa27-2de2a2627abc	[]	f	\N	19	\N	["22' (B)","24' (B)","26' (B)","24' (G)","26' (G)"]	{"24' (B)":480,"26' (B)":960,"24' (G)":1954,"26' (G)":2434}	{"22' (B)":"Bumper Pull","24' (B)":"Bumper Pull","26' (B)":"Bumper Pull","24' (G)":"Gooseneck","26' (G)":"Gooseneck"}	{"22' (B)":"21,000 lbs","24' (B)":"21,000 lbs","26' (B)":"21,000 lbs","24' (G)":"24,000 lbs","26' (G)":"24,000 lbs"}	{"22' (B)":"16,310","24' (B)":"15,890","26' (B)":"15,470","24' (G)":"18,340","26' (G)":"18,220"}	{"22' (B)":"85” x 16’ + 6’","24' (B)":"85” x 16’ + 8'","26' (B)":"85” x 18’ + 8’ ","24' (G)":"85” x 16’ + 8’","26' (G)":"85” x 18’ + 8’ "}	{"22' (B)": 1, "24' (B)": 2, "24' (G)": 4, "26' (B)": 3, "26' (G)": 5}	\N	\N	\N
47	18	BDE210	BDE210 - (Tandem 10K axles)	\N	Dual 10K	13662	/objects/models/2a0849fd-2c60-4815-b130-4acd9639ba6b	[]	f	\N	26	\N	["22'","24'","26'","28'"]	{"24'":400,"26'":800,"28'":1200}	{"22'":"Bumper Pull","24'":"Bumper Pull","26'":"Bumper Pull","28'":"Bumper Pull"}	{"22'":"20,000 lbs","24'":"20,000 lbs","26'":"20,000 lbs","28'":"20,000 lbs"}	{"22'":"14,890 lbs","24'":"14,710 lbs","26'":"14,570 lbs","28'":"14,420  lbs"}	{"22'":"96.5” x 22’","24'":"96.5” x 24’","26'":"96.5” x 26’","28'":"96.5” x 28’"}	{"22'": 1, "24'": 2, "26'": 3, "28'": 4}	\N	\N	\N
33	6	FBX215	FBX215 - (Tandem 15K axles)	96.5” x 30’ 	Dual 15K	24561	/objects/models/efe7836e-02a1-41dc-8c55-272c88d33456	[]	f	\N	15	\N	["30'","32'","26'","28'"]	{"30'":1000,"32'":1500,"28'":500}	{"30'":"Gooseneck","32'":"Gooseneck","26'":"Gooseneck","28'":"Gooseneck"}	{"30'":"30,000 lbs","32'":"30,000 lbs","26'":"30,000 lbs","28'":"30,000 lbs"}	{"30'":"23,418 lbs","32'":"23,238 lbs","26'":"23,778 lbs","28'":"23,598 lbs"}	{"30'":"96.5” x 30’ ","32'":"96.5” x 32’","26'":"96.5” x 26’","28'":"96.5” x 28’"}	{"26'": 3, "28'": 4, "30'": 1, "32'": 2}	\N	\N	\N
40	7	THO215	THO215 - DUAL WHEEL DECKOVER TILT 30K	\N	Dual 15K	30711	/objects/models/default-model.png	[]	t	\N	24	\N	["26' (G)","28' (G)","30' (G)","26' (P)","28' (P)","30' (P)"]	{"26' (G)":1365,"28' (P)":478,"30' (P)":956,"28' (G)":1843,"30' (G)":2321}	{"26' (G)":"Gooseneck","28' (G)":"Gooseneck","30' (G)":"Gooseneck","26' (P)":"Pintle","28' (P)":"Pintle","30' (P)":"Pintle"}	{"26' (G)":"30,000 lbs","28' (G)":"30,000 lbs","30' (G)":"30,000 lbs","26' (P)":"30,000 lbs","28' (P)":"30,000 lbs","30' (P)":"30,000 lbs"}	{"26' (G)":"23,130 lbs","28' (G)":"23,130 lbs","30' (G)":"22,770 lbs","26' (P)":"24,778 lbs","28' (P)":"24,598 lbs","30' (P)":"24,418 lbs"}	{"26' (G)":"96.5” x 26’","28' (G)":"96.5” x 28’","30' (G)":"96.5” x 30’ ","26' (P)":"96.5” x 26’","28' (P)":"96.5” x 28’","30' (P)":"96.5” x 30’"}	{"26' (G)": 1, "26' (P)": 4, "28' (G)": 2, "28' (P)": 5, "30' (G)": 3, "30' (P)": 6}	\N	\N	\N
38	7	THO210	THO210 - DUAL WHEEL DECKOVER TILT 20K	\N	Dual 10K	24855	/objects/models/default-model.png	[]	t	\N	24	\N	["26' (G)","28' (G)","30' (G)","26' (P)","28' (P)","30' (P)"]	{"28' (P)":-877,"26' (G)":0,"28' (G)":478,"30' (G)":956,"26' (P)":-1365,"30' (P)":-409}	{"26' (G)":"Gooseneck","28' (G)":"Gooseneck","30' (G)":"Gooseneck","26' (P)":"Pintle","28' (P)":"Pintle","30' (P)":"Pintle"}	{"26' (G)":"23,000 lbs","28' (G)":"23,000 lbs","30' (G)":"23,000 lbs","26' (P)":"20,000 lbs","28' (P)":"20,000 lbs","30' (P)":"20,000 lbs"}	{"26' (G)":"16,280 lbs","28' (G)":"16,100 lbs","30' (G)":"15,920 lbs","26' (P)":"14,778 lbs","28' (P)":"14,598 lbs","30' (P)":"14,418 lbs"}	{"26' (G)":"96.5” x 26’","28' (G)":"96.5” x 28’","30' (G)":"96.5” x 30’","26' (P)":"96.5” x 30’","28' (P)":"96.5” x 28’","30' (P)":"96.5” x 30’ "}	{"26' (G)": 1, "26' (P)": 4, "28' (G)": 2, "28' (P)": 5, "30' (G)": 3, "30' (P)": 6}	\N	\N	\N
11	7	BDE307	BDE307 - I-Beam Deckover 21K	96.5" x 20-24'	Triple 7K	13095	/objects/models/ddbf5bf2-751c-4252-a0f0-bb1e3036ca36	["96\\" Slide Out Ramps", "10\\" x 19 lb I-Beam", "Dual 12K Drop Leg Jacks", "Dexter E-Z Lube Axles", "Locking Toolbox"]	t	\N	26	\N	["20'","22'","24'"]	{"20'":0,"24'":1229,"22'":614}	{"20'":"Bumper Pull","22'":"Bumper Pull","24'":"Bumper Pull"}	{"20'":"21,000 lbs","22'":"21,000 lbs","24'":"21,000 lbs"}	{"20'":"16,442 lbs","22'":"16,618 lbs","24'":"16,794 lbs"}	{"20'":"96.5” x 20’","22'":"96.5” x 22’","24'":"96.5” x 24’ "}	{"20'": 1, "22'": 2, "24'": 3}	\N	\N	\N
46	18	BDE210SS	BDE210SS - I-BEAM DECKOVER EQUIPMENT 20K TRAILER	\N	Dual 20K	14279	/objects/models/default-model.png	[]	t	\N	26	\N	["22'","24'","26'"]	{"24'":615,"26'":1230}	{"22'":"Bumper Pull","24'":"Bumper Pull","26'":"Bumper Pull"}	{"22'":"20,000 lbs","24'":"20,000 lbs","26'":"20,000 lbs"}	{"22'":"14,940","24'":"14,760 ","26'":"14,620 "}	{"22'":"96.5” x 22’","24'":"96.5” x 24’ ","26'":"96.5” x 26’ "}	{"22'": 1, "24'": 2, "26'": 3}	\N	\N	\N
36	7	TSX208	TSX208 - (Tandem 8K axles)	\N	Dual 8K	14051	/objects/models/f7766ecf-798d-45a6-9ee3-d7c97ac85efc	[]	f	\N	19	\N	["20' (B)","22' (B)","24 (B)'","20' (G)","22' (G)","24' (G)"]	{"20' (B)":0,"22' (B)":400,"24 (B)'":800,"20' (G)":1474,"22' (G)":1874,"24' (G)":2274}	{"20' (B)":"Bumper Pull","22' (B)":"Bumper Pull","24 (B)'":"Bumper Pull","20' (G)":"Gooseneck","22' (G)":"Gooseneck","24' (G)":"Gooseneck"}	{"20' (B)":"16,000","22' (B)":"16,000","24 (B)'":"16,000","20' (G)":"18,000 ","22' (G)":"18,000 ","24' (G)":"18,000 "}	{"20' (B)":"11,780 lbs","22' (B)":"11,600 lbs","24 (B)'":"11,420 lbs","20' (G)":"12,980 lbs","22' (G)":"12,880 lbs","24' (G)":"12,760 lbs"}	{"20' (B)":"85” x 16’ + 4’","22' (B)":"85” x 16’ + 6’ ","24 (B)'":"85” x 16’ + 4’","20' (G)":"85” x 16’ + 6’ ","22' (G)":"85” x 16’ + 6’","24' (G)":"85” x 16’ + 8’"}	{"20' (B)": 1, "20' (G)": 4, "22' (B)": 2, "22' (G)": 5, "24 (B)'": 3, "24' (G)": 6}	\N	\N	\N
54	8	DHO210SS	DHO210SS - (Super Single Tandem 10K axles)	\N	Dual 10K	21196	/objects/models/a52742cb-00e8-4222-b56b-170928039d76	[]	f	\N	28	\N	["16' (B)","16' (G)","18' (G)"]	{"16' (G)":1509,"18' (G)":2059}	{"16' (B)":"Bumper Pull","16' (G)":"Gooseneck","18' (G)":"Gooseneck"}	{"16' (B)":"20,000 lbs","16' (G)":"23,000 lbs","18' (G)":"23,000 lbs"}	{"16' (B)":"13,900 lbs","16' (G)":"16,250 lbs","18' (G)":"15,700 lbs"}	{"16' (B)":"92” x 16’","16' (G)":"92” x 16’","18' (G)":"92” x 18’ "}	{"16' (B)": 1, "16' (G)": 2, "18' (G)": 3}	\N	\N	\N
51	8	DST205	DST205 - 5’ WIDE DUMP TRAILER	\N	Dual 5.2K E-Z Lube	9829	/objects/models/default-model.png	[]	t	\N	10	\N	["10'","12'"]	{"12'":657}	{"10'":"Bumper Pull","12'":"Bumper Pull"}	{"10'":"9,990","12'":"9,990"}	{"10'":"7,325 ","12'":"7,010 "}	{"10'":"60” x 10’","12'":"60” x 12’"}	{"10'": 1, "12'": 2}	\N	\N	\N
15	8	DHO212	DHO212 - (Tandem 12K axles)	92" x 16-20'	Dual 12K	24521	/objects/models/d71e412a-976a-4299-aa85-33073a661e8d	["625 Scissor Hoist", "4' Solid Sides", "Pull Style Tarp", "96\\" Slide-In Ramps", "Dexter Oil Bath Axles"]	f	\N	28	\N	["16' (G)","18' (G)","20' (G)"]	{"18' (G)":550,"20' (G)":1100}	{"16' (G)":"Gooseneck","18' (G)":"Gooseneck","20' (G)":"Gooseneck"}	{"16' (G)":"25,500 lbs","18' (G)":"25,500 lbs","20' (G)":"25,500 lbs"}	{"16' (G)":"19,150 lbs","18' (G)":"18,550 lbs","20' (G)":"17,950 lbs"}	{"16' (G)":"92” x 16’","18' (G)":"92” x 18’ ","20' (G)":"92” x 20’"}	{"16' (G)": 1, "18' (G)": 2, "20' (G)": 3}	\N	\N	\N
53	8	DHO208	DHO208 - 8’ WIDE DECKOVER DUMP 16K TRAILER	\N	Dual 8k	16351	/objects/models/default-model.png	[]	t	\N	28	\N	["14' (B)","16' (B)","14' (G)","16' (G)"]	{"14' (B)":0,"16' (B)":683,"14' (G)":1570,"16' (G)":2253}	{"14' (B)":"Bumper Pull","16' (B)":"Bumper Pull","14' (G)":"Gooseneck","16' (G)":"Gooseneck"}	{"14' (B)":"16,000","16' (B)":"16,000","14' (G)":"18,000 ","16' (G)":"18,000 "}	{"14' (B)":"11,850","16' (B)":"11,250","14' (G)":"13,096 ","16' (G)":"12,596"}	{"14' (B)":"92” x 14’ ","16' (B)":"92” x 16’","14' (G)":"92” x 14’","16' (G)":"92” x 16’"}	{"14' (B)": 1, "14' (G)": 3, "16' (B)": 2, "16' (G)": 4}	\N	\N	\N
56	9	MPR207	MPR207 - (Tandem 7K axles)	\N	Dual 7K	13867	/objects/models/9adf8447-70a4-493b-bbc0-9ea2300a63cc	[]	f	\N	7	\N	["20'","22'"]	{"22'":300}	{"20'":"Bumper Pull","22'":"Bumper Pull"}	{"20'":"14,000 lbs","22'":"14,000 lbs"}	{"20'":"11,700 lbs","22'":"11,600 lbs"}	{"20'":"98.5” x 25’","22'":"98.5” x 27’"}	{"20'": 1, "22'": 2}	\N	\N	\N
52	8	DMD207	DMD207 - 7’ WIDE 14K DUMP TRAILER	\N	Dual 7K	13900	/objects/models/default-model.png	[]	t	\N	29	\N	["12'","14'"]	{"14'":680}	{"12'":"Bumper Pull","14'":"Bumper Pull"}	{"12'":"14,000 lbs","14'":"14,000 lbs"}	{"12'":"9,950 lbs","14'":"9,850 lbs"}	{"12'":"77” x 12’","14'":"77” x 14’"}	{"12'": 1, "14'": 2}	\N	\N	\N
49	18	BDE215	BDE215 - I-BEAM DECKOVER EQUIPMENT 30K TRAILER	\N	Dual 15K	22379	/objects/models/default-model.png	[]	t	\N	26	\N	["26'","28'","30'","32'"]	{"28'":615,"30'":1229,"32'":1845}	{"26'":"Pintle ","28'":"Pintle ","30'":"Pintle ","32'":"Pintle "}	{"26'":"30,000 lbs","28'":"30,000 lbs","30'":"30,000 lbs","32'":"30,000 lbs"}	{"26'":"24,628","28'":"24,808","30'":"24,988","32'":"25,168 "}	{"26'":"96.5” x 26’","28'":"96.5” x 28’","30'":"96.5” x 30’ ","32'":"96.5” x 32’ "}	{"26'": 1, "28'": 2, "30'": 3, "32'": 4}	\N	\N	\N
55	9	MPR205	MPR205 - (Tandem 5.2K axles)	\N	Dual 5K	12942	/objects/models/e54e2d00-84c0-491c-a44f-ad7ae4f395f0	[]	f	\N	7	\N	["20'","18'"]	{"20'":300}	{"20'":"Bumper Pull","18'":"Bumper Pull"}	{"20'":"9,990 lbs","18'":"9,990 lbs"}	{"20'":"7,790 lbs","18'":"6,790 lbs"}	{"20'":"98.5” x 25’","18'":"98.5” x 23’"}	{"18'": 2, "20'": 1}	\N	\N	\N
13	8	DHV208	DHV208 - (Tandem 8K axles)	83" x 14-16'	Dual 8K	15349	/objects/models/45f9b7c1-a51f-4516-8d11-2acc4fca84c6	["520 Scissor Hoist", "Combo Barn/Spreader Gate", "Pull Style Tarp", "72\\" Slide-In Ramps", "Dexter Oil Bath Axles"]	f	\N	27	\N	["14' (B)","16' (B)","14' (G)","16' (G)"]	{"16' (B)":500,"14' (G)":1437,"16' (G)":1937}	{"14' (B)":"Bumper Pull","16' (B)":"Bumper Pull","16' (G)":"Gooseneck","14' (G)":"Gooseneck"}	{"14' (B)":"17,200 lbs","16' (B)":"17,200 lbs","16' (G)":"18,000 lbs","14' (G)":"18,000 lbs"}	{"14' (B)":"11,710 lbs","16' (B)":"11,460 lbs","16' (G)":"12,040 lbs","14' (G)":"12,290 lbs"}	{"14' (B)":"83” x 14’ ","16' (B)":"83” x 16’ ","16' (G)":"83” x 16’","14' (G)":"83” x 14’"}	{"14' (B)": 1, "14' (G)": 3, "16' (B)": 2, "16' (G)": 4}	\N	\N	["/objects/models/45f9b7c1-a51f-4516-8d11-2acc4fca84c6", "/objects/models/78840651-2317-42f4-8d95-f0c3ffe8ec8b"]
\.


--
-- Data for Name: trailer_option_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trailer_option_categories (id, "Name", "position", is_system) FROM stdin;
6	tarp	50	f
14	length	0	t
7	tires	60	f
2	extras	80	f
8	walls	70	f
3	jack	40	f
1	color	20	f
5	ramps	30	f
\.


--
-- Data for Name: trailer_options; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trailer_options (id, model_id, category, name, price, is_multi_select, is_archived, image_url, option_category, payload, applicable_models, hex_color, primer_price, is_default, is_per_ft) FROM stdin;
154	FBX307	extras	1” D-Rings	35	f	t	\N	\N	\N	["FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "THO212", "THO210", "THO215"]	\N	\N	f	f
158	TSX207	extras	3” Channel Mounted Pintle Eye 	120	f	\N	\N	\N	\N	["TSX207", "TSX208", "TSX307", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212", "DHV207", "DHV208", "DHO208", "Test"]	\N	\N	f	f
173	BDE210SS	extras	3” Plate Mounted Pintle Ring	285	f	\N	\N	\N	\N	["BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212", "DHV207", "DHV208", "TSX207", "TSX208", "TSX307"]	\N	\N	f	f
146	FBH208	extras	Winch, 4” Sliding (in slide track) 	80	f	t	\N	\N	\N	["FBH208", "FBH207", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE307", "BDE208", "BDE212"]	\N	\N	f	f
164	TSX307	extras	Drive Over Fenders (21k) 	2580	f	\N	\N	\N	\N	["TSX307"]	\N	\N	f	f
162	TSX207	extras	Drive Over Fenders (14 & 16k) 	1920	f	\N	\N	\N	\N	["TSX207", "TSX208"]	\N	\N	f	f
170	THO212	extras	2.5” Plate Mounted Pintle Ring	210	f	\N	\N	\N	\N	["THO212", "THO210", "THO215", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212"]	\N	\N	f	f
193	DHV207	jack	12K Drop Leg Jack (Bolt On)	0	f	\N	\N	\N	\N	["DHV207", "DHV208", "TSX207", "TSX208", "TSX307", "MPR207"]	\N	\N	f	f
163	TSX207	extras	Drive Over Fenders w/ Center D-Rings (14 & 16k)	2400	f	t	\N	\N	\N	["TSX207", "TSX208", "TSX307"]	\N	\N	f	f
175	DHV207	extras	Extra Storage Box in Uprights	245	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
171	THO215	extras	Hydraulic Power Tilt with Pump Box	1644	f	t	\N	\N	\N	["THO215", "THO212", "THO210"]	\N	\N	f	f
160	TSX207	extras	Beveled Knife Edge 	0	f	\N	\N	\N	\N	["TSX207", "TSX208", "TSX307"]	\N	\N	f	f
137	DHV207	Color	White	1200	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "BDE307", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210SS", "BDE210", "BDE215", "DST235", "DST205", "DMD207", "DHO208", "DHO210SS", "FBX210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "THO210", "THO212", "THO215", "BDE212", "FBH307", "FBH210"]	#FFFFFF	\N	f	f
24	FBH207	tires	ST235/85R16 "G" 14 Ply Upgrade	665	f	f	\N	\N	\N	["FBH207", "TSX207", "BDE207", "DMD207", "DHV207", "MPR207"]	\N	\N	f	f
150	FBX307	tires	ST235/85R16 “G” 14 Ply Upgrade	1225	f	\N	\N	\N	\N	["FBX307", "FBX212", "BDE307", "FBX210", "DHO210", "DHO212"]	\N	\N	f	f
138	DHV207	Color	Tractor Green	800	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "BDE307", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210SS", "BDE210", "BDE215", "DST235", "DST205", "DMD207", "DHO208", "DHO210SS", "FBX210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TSX207", "TMX107", "TSX208", "TSX307", "THO210", "THO212", "THO215", "BDE212"]	#008000	1200	f	f
188	DHV207	walls	40" Wall with Board Brackets (32" Solid + 8" Board)	1540	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS"]	\N	\N	f	f
133	DHV207	Color	Gunmetal Gray	0	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "BDE307", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210SS", "BDE210", "BDE215", "DST235", "DST205", "DMD207", "DHO208", "DHO210SS", "FBX210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TMX107", "TSX207", "TSX208", "THO210", "TSX307", "THO212", "THO215", "BDE212"]	#818589	400	f	f
135	DHV207	Color	Red	350	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "BDE307", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210SS", "BDE210", "BDE215", "DST235", "DST205", "DMD207", "DHO210SS", "DHO208", "FBX210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TSX207", "TSX208", "TSX307", "THO210", "THO212", "THO215", "BDE212", "TMX107", "FBH307", "FBH210"]	#FF0000	750	f	f
134	DHV207	Color	Walton Gray	0	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "BDE307", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210SS", "BDE210", "BDE215", "DST235", "DMD207", "DST205", "DHO208", "DHO210SS", "FBX210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "THO210", "THO212", "THO215", "BDE212", "FBH307", "FBH210"]	#B2BEB5	650	f	f
167	TSX207	extras	Lockout Ball Valve 	546	f	t	\N	\N	\N	["TSX207", "TSX208", "TSX307"]	\N	\N	f	f
168	TSX207	extras	Graytex Runners	959	f	t	\N	\N	\N	["TSX207", "TSX208", "TSX307"]	\N	\N	f	f
166	TSX208	extras	Metering Valve	480	f	\N	\N	\N	\N	["TSX208", "TSX207", "TSX307"]	\N	\N	f	f
157	TSX307	tires	ST235/85R16 “G” 14 Ply Upgrade	825	f	\N	\N	\N	\N	["TSX307"]	\N	\N	f	f
155	TMX107	tires	ST235/85R16 “G” 14 Ply Upgrade	360	f	\N	\N	\N	\N	["TMX107"]	\N	\N	f	f
152	FBX307	extras	3" Channel on 12" Centers / per ft. 	11	f	\N	\N	\N	\N	["FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "BDE210SS", "BDE210", "BDE215", "BDE307", "BDE212", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS", "TSX307", "TSX208"]	\N	\N	f	t
28	FBH207	ramps	Straight Deck w/ 96" Slide Out Ramps	-500	f	f	\N	\N	\N	["FBH207", "FBH208", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215"]	\N	\N	f	f
29	FBH207	extras	Winch Plate, Gooseneck Mounted	170	f	t	\N	\N	\N	["FBH207", "FBH208", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "TSX207", "TSX208", "TSX307", "THO212", "THO210", "THO215"]	\N	\N	f	f
187	FBH207	jack	Dual 12K Drop Leg Jacks (Bolt On)	0	f	\N	\N	\N	\N	["FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "BDE210", "BDE207", "BDE208", "BDE212"]	\N	\N	f	f
189	DHO210	walls	40" Walls (Solid)	1800	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO210SS"]	\N	\N	f	f
179	DHO210	walls	40” Wall with 16” Fold (24” + 16” Fold) (One Side - Driver/Passenger)	2600	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO210SS"]	\N	\N	f	f
192	DHO210	walls	40" Wall with Board Brackets (32" Solid + 8" Board)	1845	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO210SS"]	\N	\N	f	f
153	FBX307	extras	4" Channel on 18" Centers / per ft. 	14	f	\N	\N	\N	\N	["FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215"]	\N	\N	f	t
144	FBH208	extras	3" Channel on 16" Centers / per ft.	8	f	\N	\N	\N	\N	["FBH208", "FBH207", "TSX207", "TSX208", "TSX307", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212"]	\N	\N	f	t
25	FBH207	jack	Dual 2-Speed Jacks	300	f	f	\N	\N	\N	["FBH207", "FBH208", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "THO210", "THO212", "THO215", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212"]	\N	\N	f	f
194	DHV207	tires	ST235/80R16 “E” 10 Ply	0	f	\N	\N	\N	\N	["DHV207", "MPR207", "TSX207", "TSX307", "TMX107", "BDE207", "FBH307", "FBH207"]	\N	\N	f	f
54	DHV208	walls	40" Walls (Solid)	1500	f	f	\N	\N	\N	["DHV208", "DHV207", "DHO208"]	\N	\N	f	f
190	DHO210	walls	32” Walls (Solid)	1610	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO210SS"]	\N	\N	f	f
41	DST235	extras	3 Watt Solar Charger	180	f	f	/objects/models/2253a91d-fe9f-463b-b6f8-7531a6a915a8	\N	\N	["DST235", "DST205", "DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS", "MPR205", "MPR207"]	\N	\N	f	f
195	FBH307	tires	ST235/85R16 “G” 14 Ply Upgrade	930	f	\N	\N	\N	\N	["FBH307", "TSX307"]	\N	\N	f	f
45	BDE207	ramps	96" Slide Out Ramps (Standard)	0	f	f	\N	\N	\N	["BDE207"]	\N	\N	f	f
72	FBH208	extras	Chain Spool	275	f	f	\N	\N	\N	["FBH208", "FBH207", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212", "FBH307", "FBH210"]	\N	\N	f	f
56	DHO210	tarp	Long Arm Tarp System	1900	f	f	\N	\N	\N	["DHO210"]	\N	\N	f	f
151	FBX210	extras	Torque Tube	780	f	\N	/objects/models/306d898f-7647-4c89-91a9-e264ad38c166	\N	\N	["FBX210", "FBX210SS", "FBX215", "FBX212", "FBX307", "BDE210SS", "BDE210", "BDE215", "BDE307", "BDE212"]	\N	\N	f	f
165	TSX207	extras	Drive Over Fenders w/ Center D-Rings (21k)	3075	f	t	\N	\N	\N	["TSX207", "TSX208", "TSX307"]	\N	\N	f	f
66	FBH208	jack	Dual 12K Hydraulic Jacks	1930	f	f	\N	\N	\N	["FBH208", "FBH207", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "THO210", "THO212", "THO215", "BDE212", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "DHO208", "FBH307", "FBH210"]	\N	\N	f	f
46	BDE207	extras	Winch Plate	170	f	t	\N	\N	\N	["BDE207"]	\N	\N	f	f
47	BDE207	extras	Additional D-Rings	35	t	t	\N	\N	\N	["BDE207"]	\N	\N	f	f
176	DHV207	extras	Barn Door	0	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
172	THO215	extras	4" Channel on 12" Centers / per ft.	12	t	t	\N	\N	\N	["THO215", "THO212", "THO210"]	\N	\N	f	f
61	FBX210SS	extras	Deck on Neck	2050	f	f	\N	\N	\N	["FBX210SS", "FBX210", "FBX307", "FBX212", "FBX215", "THO215", "THO212", "THO210", "DHO208", "FBH307", "FBH208", "FBH207", "FBH210"]	\N	\N	f	f
156	TMX107	extras	14K Adjustable Pintle Ring 	80	f	t	\N	\N	\N	["TMX107"]	\N	\N	f	f
147	FBH207	extras	Winch, 4” (Weld-on) 	80	f	t	\N	\N	\N	["FBH207", "FBH208", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212"]	\N	\N	f	f
161	TSX207	extras	Full Knife Edge 	0	f	\N	\N	\N	\N	["TSX207", "TSX208", "TSX307"]	\N	\N	f	f
177	DHV207	extras	Long Arm Tarp System (not available with fold down wall option) 	1900	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
141	DHV207	Color	Black	0	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210", "DHO210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212", "FBH307", "FBH210"]	#000000	400	f	f
70	FBH208	extras	LED Light Bar	380	f	f	/objects/models/587be062-5c84-4ce0-880b-ed41fc576ddc	\N	\N	["FBH208", "FBH207", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "THO210", "THO212", "THO215", "FBH307", "FBH210"]	\N	\N	f	f
200	DHV207	color	Red	450	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#ff2c2c	500	f	f
59	DHV207	extras	Rear Support Stands	265	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
145	FBH208	extras	Sliding Winch Track (6ft Sections)	180	f	t	\N	\N	\N	["FBH208", "FBH207", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212"]	\N	\N	f	f
196	DHV207	color	Desert Tan	350	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#c1af89	\N	f	f
39	DHV207	tarp	Pull Style Tarp	0	f	f	\N	\N	\N	["DHV207"]	\N	\N	f	f
55	DHO210	tarp	Pull Style Tarp	0	f	f	\N	\N	\N	["DHO210"]	\N	\N	f	f
197	DHV207	color	Gunmetal Gray	0	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#353E43	500	f	f
198	DHV207	color	Black	0	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#000	0	f	f
202	DHV207	color	Desert Tan	350	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#c1af89	500	f	f
178	DHV207	walls	32” Walls (Solid)	1340	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO208"]	\N	\N	f	f
60	DHV208	extras	7 ga. Floor Upgrade (per ft)	60	f	f	\N	\N	\N	["DHV208", "DHV207", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	t
199	DHV207	color	Gentian Blue	350	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#005596	500	f	f
180	DHV208	walls	40” Wall with 16” Fold (24” + 16” Fold) (Both Sides)	2675	f	\N	\N	\N	\N	["DHV208", "DHV207"]	\N	\N	f	f
169	THO210	tires	ST235/85R16 “G” 14 Ply	1300	f	\N	\N	\N	\N	["THO210", "THO212", "BDE210", "BDE212", "DHO210", "DHO212"]	\N	\N	f	f
37	DHV207	walls	24" Walls (Standard)	0	f	f	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "DHO208"]	\N	\N	f	f
174	DST235	tires	ST205/75R15 “C” 6 Ply	0	f	t	\N	\N	\N	["DST235", "DST205"]	\N	\N	f	f
184	DHO210	walls	40” Wall with 16” Fold (24” + 16” Fold) (Both Sides)	2985	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
139	DHV207	Color	Gentian Blue 	350	f	t	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "BDE207", "BDE307", "FBH207", "FBH208", "FBX307", "FBX210", "BDE210SS", "BDE210", "BDE215", "DST235", "DST205", "DMD207", "DHO208", "DHO210SS", "FBX210SS", "FBX212", "FBX215", "MPR205", "MPR207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "THO210", "THO212", "THO215", "BDE212", "FBH210", "FBH307"]	#09203F	\N	f	f
201	DHV207	color	White	1200	f	\N	\N	\N	\N	["DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO210SS", "FBH207", "FBH208", "FBH307", "FBX210", "FBH210", "FBX212", "FBX215", "MPR205", "MPR207", "BDE210", "BDE207", "BDE208", "TMX107", "TSX207", "TSX208", "TSX307", "BDE212"]	#FFF	\N	f	f
159	TSX207	extras	2.5” Plate Mounted Pintle Eye 	205	f	t	\N	\N	\N	["TSX207", "TSX208", "TSX307", "THO210", "THO212", "THO215", "DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
73	FBH208	extras	D-Rings (⅝") Each	25	t	t	\N	\N	\N	["FBH208", "FBH207", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "TMX107", "TSX207", "TSX208", "TSX307", "DST235", "DST205", "DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS", "MPR207", "MPR205"]	\N	\N	f	f
185	MPR205	extras	Enclosed Dump Box	125	f	t	\N	\N	\N	["MPR205", "MPR207"]	\N	\N	f	f
186	MPR205	extras	Landscape Tool Rack 	335	f	t	\N	\N	\N	["MPR205", "MPR207"]	\N	\N	f	f
36	TSX207	jack	Single 12K Hydraulic Jack Upgrade	1300	f	f	\N	\N	\N	["TSX207", "TSX208", "TSX307", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212", "DST235", "DST205", "DHV207", "DHV208", "DHO212", "DHO210", "DHO215", "DHO208", "DHO210SS", "MPR205", "MPR207"]	\N	\N	f	f
148	FBH208	tires	ST215/75R17.5 “J” 18 Ply Standard	0	f	\N	\N	\N	\N	["FBH208", "FBH207", "TSX208", "THO215", "BDE208", "BDE210SS", "BDE215", "DHV208", "DHO208", "DHO210SS", "DHO215"]	\N	\N	f	f
40	DST235	extras	Wireless Remote	360	f	f	\N	\N	\N	["DST235", "DST205", "DHV207", "DHV208", "DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS", "MPR205", "MPR207"]	\N	\N	f	f
67	FBH208	ramps	Mega Ramps	0	f	f	\N	\N	\N	["FBH208", "FBH207", "BDE210SS", "BDE215", "BDE307", "FBX212", "FBX215", "FBH210", "FBX210", "FBH307"]	\N	\N	f	f
181	DHO210	walls	Full 24” Fold Wall (One Side - Driver/Passenger) 	810	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
31	FBH207	extras	Under Deck Storage Box (37” x 10” x 12”)	245	f	f	/objects/models/1a70d16f-2692-49f4-847c-77f37631d6d6	\N	\N	["FBH207", "FBH208", "FBX307", "FBX210", "FBX210SS", "FBX212", "FBX215", "THO210", "THO212", "THO215", "BDE210SS", "BDE210", "BDE215", "BDE207", "BDE208", "BDE307", "BDE212", "FBH307", "FBH210"]	\N	\N	f	f
38	DST235	walls	32" Wall with Board Brackets (24" Solid + 8" Board)	1360	f	f	\N	\N	\N	["DST235", "DST205", "DHV207", "DHV208", "DHO208"]	\N	\N	f	f
149	FBX307	tires	ST235/80R16 “E” 10 Ply Standard	0	f	\N	\N	\N	\N	["FBX307", "FBX210", "FBX212", "TMX107", "TSX307", "THO210", "THO212", "BDE207", "BDE307", "BDE210", "BDE212", "DST235", "DST205", "DMD207", "DHO210", "DHO212", "MPR207", "MPR205"]	\N	\N	f	f
182	DHO210	walls	Full 24” Fold Wall (Both Sides)	1620	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO208", "DHO210SS"]	\N	\N	f	f
191	DHO210	walls	32" Wall with Board Brackets (24" Solid + 8" Board)	1635	f	\N	\N	\N	\N	["DHO210", "DHO212", "DHO215", "DHO210SS"]	\N	\N	f	f
183	DHO208	walls	40” Wall with 16” Fold (24” + 16” Fold) (One Side - Driver/Passenger)	2165	f	\N	\N	\N	\N	["DHO208", "DHV208", "DHV207"]	\N	\N	f	f
\.


--
-- Data for Name: trailer_series; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.trailer_series (id, category_id, name, description, slug, base_price, created_at, updated_at, is_archived, image_url) FROM stdin;
26	18	BDE	I-Beam Deckover Equipment Trailers 	bde	9355	2025-09-24 20:23:41.164018	2025-09-24 20:23:41.164018	\N	/objects/models/c00c3de2-7c63-40b9-ad64-a862dbc970f1
15	6	FBX	Dual Wheel Gooseneck Deckover	fbx	16903	2025-09-19 19:20:11.852705	2025-09-19 19:20:11.852705	f	/objects/models/3186a88e-f031-45ad-8b72-ee89f73cb9a4
29	8	DMD	6.5’ Wide Dump Trailers	dmd	13900	2025-09-24 20:26:57.836526	2025-09-24 20:26:57.836526	t	\N
10	8	DST	5’ Wide Dump Trailers	dst	8346	2025-09-03 22:34:16.138301	2025-09-03 22:34:16.138301	t	\N
24	7	THO	Dual Wheel Gravity Tilt Deckover Trailers	tho	24855	2025-09-24 20:20:37.572821	2025-09-24 20:20:37.572821	t	\N
8	7	TMX	Single-Axle Mini Tilt	tmx	6783	2025-09-03 22:10:22.151186	2025-09-03 22:10:22.151186	f	/objects/models/eadc1b81-0775-449e-b237-0a508a0d2f4c
2	6	FBL Light Series	Lightweight flatbed trailers for everyday hauling	fbl-light	10000	2025-08-26 03:50:03.234229	2025-08-26 03:50:03.234229	t	\N
4	7	ETS Standard Series	Standard equipment hauling trailers	ets-standard	9500	2025-08-26 03:50:03.234229	2025-08-26 03:50:03.234229	t	\N
3	7	ETL Tilt Series	Equipment trailers with hydraulic tilt functionality	etl-tilt	12000	2025-08-26 03:50:03.234229	2025-08-26 03:50:03.234229	t	\N
1	6	FBH	Single Wheel Gooseneck Deckover	fbh	12408	2025-08-26 03:50:03.234229	2025-08-26 03:50:03.234229	f	/objects/models/0b773635-015d-4407-8a9d-8e5e98ba8c45
27	8	DHV	7’ Wide Dump Trailers	dhv	12493	2025-09-24 20:25:15.600115	2025-09-24 20:25:15.600115	\N	/objects/models/bff4115f-fc4c-4bdf-9191-bf1675d8d1da
7	9	MPR	MowPro Landscape Trailer	mpr	12942	2025-09-03 20:49:58.5546	2025-09-03 20:49:58.5546	f	/objects/models/e04e8fdb-1524-4767-861c-33c0dac6e88a
9	7	test	set	est	9479	2025-09-03 22:26:03.729911	2025-09-03 22:26:03.729911	t	\N
28	8	DHO	 8’ Wide Deckover Dump Trailers	dho	20861	2025-09-24 20:25:53.168238	2025-09-24 20:25:53.168238	\N	/objects/models/8250c1fd-0148-4feb-936f-327f8f6bcee2
19	7	TSX	Gravity Equipment Tilt Trailers	tsx	11012	2025-09-24 20:12:31.622804	2025-09-24 20:12:31.622804	\N	/objects/models/5de6415f-72a6-4056-8176-3bd26249d5b4
6	9	LSG Gate Series	Landscape trailers with side gates	lsg-gate	6000	2025-08-26 03:50:03.234229	2025-08-26 03:50:03.234229	t	\N
5	8	DHS High Side Series	High-sided dump trailers for maximum capacity	12	123	2025-08-26 03:50:03.234229	2025-08-26 03:50:03.234229	t	\N
\.


--
-- Data for Name: user_configurations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_configurations (id, session_id, category_slug, model_id, selected_options, total_price, created_at) FROM stdin;
\.


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 10, true);


--
-- Name: custom_quote_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.custom_quote_requests_id_seq', 1, false);


--
-- Name: dealer_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.dealer_orders_id_seq', 15, true);


--
-- Name: dealer_password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.dealer_password_reset_tokens_id_seq', 18, true);


--
-- Name: dealer_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.dealer_users_id_seq', 2, true);


--
-- Name: dealers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.dealers_id_seq', 3, true);


--
-- Name: media_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.media_files_id_seq', 73, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 4, true);


--
-- Name: quote_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.quote_requests_id_seq', 12, true);


--
-- Name: trailer_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.trailer_categories_id_seq', 24, true);


--
-- Name: trailer_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.trailer_models_id_seq', 62, true);


--
-- Name: trailer_option_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.trailer_option_categories_id_seq', 14, true);


--
-- Name: trailer_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.trailer_options_id_seq', 210, true);


--
-- Name: trailer_series_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.trailer_series_id_seq', 35, true);


--
-- Name: user_configurations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.user_configurations_id_seq', 1, false);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: custom_quote_requests custom_quote_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_quote_requests
    ADD CONSTRAINT custom_quote_requests_pkey PRIMARY KEY (id);


--
-- Name: dealer_orders dealer_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_orders
    ADD CONSTRAINT dealer_orders_order_number_key UNIQUE (order_number);


--
-- Name: dealer_orders dealer_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_orders
    ADD CONSTRAINT dealer_orders_pkey PRIMARY KEY (id);


--
-- Name: dealer_password_reset_tokens dealer_password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_password_reset_tokens
    ADD CONSTRAINT dealer_password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: dealer_password_reset_tokens dealer_password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_password_reset_tokens
    ADD CONSTRAINT dealer_password_reset_tokens_token_key UNIQUE (token);


--
-- Name: dealer_sessions dealer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_sessions
    ADD CONSTRAINT dealer_sessions_pkey PRIMARY KEY (id);


--
-- Name: dealer_user_sessions dealer_user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_user_sessions
    ADD CONSTRAINT dealer_user_sessions_pkey PRIMARY KEY (id);


--
-- Name: dealer_users dealer_users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_users
    ADD CONSTRAINT dealer_users_email_key UNIQUE (email);


--
-- Name: dealer_users dealer_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_users
    ADD CONSTRAINT dealer_users_pkey PRIMARY KEY (id);


--
-- Name: dealer_users dealer_users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_users
    ADD CONSTRAINT dealer_users_username_key UNIQUE (username);


--
-- Name: dealers dealers_dealer_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealers
    ADD CONSTRAINT dealers_dealer_id_key UNIQUE (dealer_id);


--
-- Name: dealers dealers_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealers
    ADD CONSTRAINT dealers_email_key UNIQUE (email);


--
-- Name: dealers dealers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealers
    ADD CONSTRAINT dealers_pkey PRIMARY KEY (id);


--
-- Name: media_files media_files_object_path_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_object_path_key UNIQUE (object_path);


--
-- Name: media_files media_files_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.media_files
    ADD CONSTRAINT media_files_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: quote_requests quote_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.quote_requests
    ADD CONSTRAINT quote_requests_pkey PRIMARY KEY (id);


--
-- Name: trailer_categories trailer_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_categories
    ADD CONSTRAINT trailer_categories_pkey PRIMARY KEY (id);


--
-- Name: trailer_categories trailer_categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_categories
    ADD CONSTRAINT trailer_categories_slug_unique UNIQUE (slug);


--
-- Name: trailer_lengths trailer_lengths_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_lengths
    ADD CONSTRAINT trailer_lengths_pkey PRIMARY KEY (id);


--
-- Name: trailer_models trailer_models_model_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_models
    ADD CONSTRAINT trailer_models_model_id_unique UNIQUE (model_id);


--
-- Name: trailer_models trailer_models_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_models
    ADD CONSTRAINT trailer_models_pkey PRIMARY KEY (id);


--
-- Name: trailer_option_categories trailer_option_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_option_categories
    ADD CONSTRAINT trailer_option_categories_pkey PRIMARY KEY (id);


--
-- Name: trailer_options trailer_options_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_options
    ADD CONSTRAINT trailer_options_pkey PRIMARY KEY (id);


--
-- Name: trailer_series trailer_series_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_series
    ADD CONSTRAINT trailer_series_pkey PRIMARY KEY (id);


--
-- Name: trailer_series trailer_series_slug_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_series
    ADD CONSTRAINT trailer_series_slug_key UNIQUE (slug);


--
-- Name: user_configurations user_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_configurations
    ADD CONSTRAINT user_configurations_pkey PRIMARY KEY (id);


--
-- Name: idx_trailer_options_applicable_models; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_trailer_options_applicable_models ON public.trailer_options USING gin (applicable_models);


--
-- Name: dealer_orders dealer_orders_dealer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_orders
    ADD CONSTRAINT dealer_orders_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES public.dealers(id);


--
-- Name: dealer_sessions dealer_sessions_dealer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_sessions
    ADD CONSTRAINT dealer_sessions_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES public.dealers(id);


--
-- Name: dealer_user_sessions dealer_user_sessions_dealer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_user_sessions
    ADD CONSTRAINT dealer_user_sessions_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES public.dealers(id);


--
-- Name: dealer_user_sessions dealer_user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_user_sessions
    ADD CONSTRAINT dealer_user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.dealer_users(id);


--
-- Name: dealer_users dealer_users_dealer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dealer_users
    ADD CONSTRAINT dealer_users_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES public.dealers(id);


--
-- Name: trailer_models trailer_models_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_models
    ADD CONSTRAINT trailer_models_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.trailer_series(id);


--
-- Name: trailer_series trailer_series_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.trailer_series
    ADD CONSTRAINT trailer_series_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.trailer_categories(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict vFD1OYJE2tS9bJ8QBvQkRbXcx8rQbmGDgNqht08uilGlhMv0Neb7PjAkSAbpXA7

