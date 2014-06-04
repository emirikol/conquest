require 'rubygems'
require 'sinatra'
require 'erb'
require 'pusher'



# Set Haml output format and enable escapes
#set :haml, {:format => :html5 , :escape_html => true }

# Main board
get '/' do
	erb :'lobby.html'
end

get '/conquest' do
	headers 'Content-Type' => 'application/xhtml+xml'
	@game_id = params[:game_id]
	@new = !params[:game_id]
	erb :'conquest.html'
end

post '/push' do
	Pusher.app_id = '7897'
  Pusher.key = 'f46e19fb4871e918a977'
  Pusher.secret = '5738a8e13cebdd9c63cf'
	#parse data to hash? just leave as json?
	Pusher[params[:c]].trigger!(params[:e], params[:d], params[:socket_id])
	#enter game => ask for place? Game.join?(uid) => white player gets message. Game.joined(uid)
	#Game.white_moved => black player updates screen and takes turn
	#Game.black_moved => white player updates screen and takes turn 
	#or exclude socket(send pusher.connection.socket_id as param) or add player moving to data and ignore
end