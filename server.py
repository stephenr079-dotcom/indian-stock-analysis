import os
import shutil
from flask import Flask, request, jsonify, send_from_directory
import analyzer

app = Flask(__name__, static_folder='.')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'temp_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/analyze', methods=['POST'])
def handle_analysis():
    try:
        ticker = request.form.get('ticker', '').strip()
        if not ticker:
            return jsonify({'success': False, 'error': 'Please provide a valid stock name or ticker.'}), 400

        uploaded_files = request.files.getlist('files')
        saved_paths = []

        if uploaded_files:
            for file in uploaded_files:
                if file.filename:
                    save_path = os.path.join(UPLOAD_FOLDER, file.filename)
                    file.save(save_path)
                    saved_paths.append(save_path)

        # Run Analysis
        analysis_result = analyzer.analyze_stock(ticker, saved_paths)

        # Clean up uploaded files after analysis
        for p in saved_paths:
            try:
                os.remove(p)
            except Exception:
                pass

        return jsonify({'success': True, 'data': analysis_result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"Starting Institutional Stock Analysis Server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
