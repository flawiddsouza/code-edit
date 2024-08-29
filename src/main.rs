use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder, middleware::Logger};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs::File, io::Read, path::PathBuf, sync::Mutex};
use uuid::Uuid;
use lazy_static::lazy_static;
use std::env::args as get_args;
use std::fs;

#[derive(Deserialize, Serialize)]
struct SaveRequest {
    path: String,
    content: String,
}

lazy_static! {
    static ref FILE_MAP: Mutex<HashMap<Uuid, String>> = Mutex::new(HashMap::new());
}

#[get("/{uuid}")]
async fn serve_editor() -> impl Responder {
    let html_content = include_str!("../static/editor.html");
    HttpResponse::Ok().content_type("text/html").body(html_content)
}

#[get("/file/{uuid}")]
async fn get_file_content(uuid: web::Path<Uuid>) -> impl Responder {
    let file_map = FILE_MAP.lock().unwrap();
    if let Some(file_path) = file_map.get(&uuid) {
        let mut file_content = String::new();
        if !PathBuf::from(file_path).exists() {
            file_content = String::new();
        } else if File::open(file_path).and_then(|mut file| file.read_to_string(&mut file_content)).is_err() {
            return HttpResponse::InternalServerError().body("Error reading file");
        }
        HttpResponse::Ok().body(file_content)
    } else {
        HttpResponse::NotFound().body("File not found")
    }
}

#[post("/save")]
async fn save_file(web::Json(request): web::Json<SaveRequest>) -> impl Responder {
    let file_map = FILE_MAP.lock().unwrap();
    let file_path = match file_map.get(&Uuid::parse_str(&request.path).unwrap_or_else(|_| Uuid::nil())) {
        Some(path) => path,
        None => return HttpResponse::NotFound().body("File path not found."),
    };

    let path = PathBuf::from(file_path.as_str());
    if let Err(e) = fs::write(&path, &request.content) {
        eprintln!("Error writing file: {}", e);
        return HttpResponse::InternalServerError().body("Error saving file.");
    }

    HttpResponse::Ok().body("File saved.")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let args: Vec<String> = get_args().collect();
    let mut enable_logs = false;
    let mut file_paths = Vec::new();

    for arg in &args[1..] {
        if arg == "--logs" {
            enable_logs = true;
        } else {
            file_paths.push(arg.clone());
        }
    }

    if enable_logs {
        env_logger::init_from_env(env_logger::Env::new().default_filter_or("actix_web=info,actix_server=warn"));
    }

    if file_paths.is_empty() {
        eprintln!("Usage: code-edit <file-path>... [--logs]");
        return Ok(());
    }

    for path in file_paths {
        let uuid = Uuid::new_v4();
        FILE_MAP.lock().unwrap().insert(uuid, path.to_string());
        println!("Open: http://localhost:6044/{} (File: {})", uuid, path);
    }

    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .service(serve_editor)
            .service(get_file_content)
            .service(save_file)
    })
    .bind("127.0.0.1:6044")?
    .run()
    .await
}
