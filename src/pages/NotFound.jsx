import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (<div className="flex flex-col items-center gap-3 py-24 text-center"><Compass className="h-10 w-10 text-muted" /><h1 className="text-xl">Không tìm thấy trang</h1><p className="text-sm text-muted">Đường dẫn không tồn tại hoặc đã được chuyển đi.</p><Link to="/" className="link">Về trang chủ</Link></div>);
}
